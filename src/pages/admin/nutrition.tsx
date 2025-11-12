// src/pages/admin/nutrition.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import './nutrition.css';

interface NutritionInfo {
  id: number;
  image_path: string;
  created_at: string;
}

const AdminNutrition: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [nutritionInfo, setNutritionInfo] = useState<NutritionInfo | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchNutritionInfo();
    }
  }, [isAuthenticated, user]);

  const fetchNutritionInfo = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/nutrition/admin');
      setNutritionInfo(response.data.nutrition);
    } catch (error) {
      console.error('Failed to fetch nutrition info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      await axios.post('/api/nutrition/admin', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('영양성분 정보가 업데이트되었습니다.');
      setSelectedFile(null);
      setPreviewUrl('');
      fetchNutritionInfo();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!nutritionInfo) return;

    if (!confirm('영양성분 정보를 삭제하시겠습니까?')) return;

    try {
      await axios.delete(`/api/nutrition/admin/${nutritionInfo.id}`);
      alert('삭제되었습니다.');
      fetchNutritionInfo();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="admin-nutrition-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-nutrition-container">
      <h1 className="admin-title">영양성분 관리</h1>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      ) : (
        <>
          {/* 현재 영양성분 정보 */}
          <div className="current-nutrition-section">
            <h2>현재 영양성분 정보</h2>
            {nutritionInfo && nutritionInfo.image_path ? (
              <div className="nutrition-preview">
                <img
                  src={nutritionInfo.image_path}
                  alt="현재 영양성분표"
                  className="nutrition-image"
                />
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  style={{ marginTop: '1rem' }}
                >
                  삭제
                </button>
              </div>
            ) : (
              <p className="no-data">등록된 영양성분 정보가 없습니다.</p>
            )}
          </div>

          {/* 업로드 섹션 */}
          <div className="upload-section">
            <h2>새 영양성분 정보 업로드</h2>
            <div className="upload-form">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="file-input"
              />

              {previewUrl && (
                <div className="preview-container">
                  <h3>미리보기</h3>
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="preview-image"
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                style={{ marginTop: '1rem' }}
              >
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminNutrition;
