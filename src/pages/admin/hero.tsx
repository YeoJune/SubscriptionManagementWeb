// src/pages/admin/hero.tsx
import React, { useState, useEffect, useRef } from 'react';
import './hero.css';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface HeroSlide {
  id: number;
  title: string;
  subtitle?: string;
  images?: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const AdminHero: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 다이얼로그 상태
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedSlide, setSelectedSlide] = useState<HeroSlide | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // 이미지 업로드를 위한 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 히어로 슬라이드 폼 상태
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    is_active: true,
    display_order: 0,
    images: [] as File[],
    existingImages: [] as string[],
    removeImages: false,
  });

  // 삭제 확인 다이얼로그 상태
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<HeroSlide | null>(null);

  // 이미지 미리보기 URL들
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchSlides();
    }
  }, [isAuthenticated, user]);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hero/admin');
      setSlides(response.data.slides);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch hero slides:', err);
      setError('히어로 슬라이드를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setSlideForm({
      title: '',
      subtitle: '',
      is_active: true,
      display_order: slides.length,
      images: [],
      existingImages: [],
      removeImages: false,
    });
    setImagePreviews([]);
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleOpenEditDialog = (slide: HeroSlide) => {
    setDialogMode('edit');
    setSelectedSlide(slide);
    setSlideForm({
      title: slide.title,
      subtitle: slide.subtitle || '',
      is_active: slide.is_active,
      display_order: slide.display_order,
      images: [],
      existingImages: slide.images || [],
      removeImages: false,
    });
    setImagePreviews(slide.images || []);
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSlide(null);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // 전체 이미지 개수 확인
    const totalCurrentImages =
      slideForm.existingImages.length + slideForm.images.length;
    const totalAfterAddition = totalCurrentImages + files.length;

    if (totalAfterAddition > 10) {
      setDialogError(
        `이미지는 최대 10개까지만 업로드할 수 있습니다. (현재: ${totalCurrentImages}개, 추가하려는: ${files.length}개)`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const updatedImages = [...slideForm.images, ...files];
    setSlideForm({
      ...slideForm,
      images: updatedImages,
      removeImages: false,
    });

    // 새로 추가되는 이미지들의 미리보기만 생성
    const previewPromises = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises)
      .then((newPreviews) => {
        setImagePreviews([...imagePreviews, ...newPreviews]);
        setDialogError(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('이미지 미리보기 생성 실패:', error);
        setDialogError('이미지 미리보기 생성에 실패했습니다.');
      });
  };

  const handleRemoveImages = () => {
    setSlideForm({
      ...slideForm,
      images: [],
      existingImages: [],
      removeImages: true,
    });
    setImagePreviews([]);
    setDialogError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveIndividualImage = (indexToRemove: number) => {
    const totalExistingImages = slideForm.existingImages.length;

    if (indexToRemove < totalExistingImages) {
      // 기존 이미지 제거
      const newExistingImages = slideForm.existingImages.filter(
        (_, index) => index !== indexToRemove
      );
      const newPreviews = imagePreviews.filter(
        (_, index) => index !== indexToRemove
      );

      setSlideForm({ ...slideForm, existingImages: newExistingImages });
      setImagePreviews(newPreviews);
    } else {
      // 새 이미지 제거
      const newImageIndex = indexToRemove - totalExistingImages;
      const newImages = slideForm.images.filter(
        (_, index) => index !== newImageIndex
      );
      const newPreviews = imagePreviews.filter(
        (_, index) => index !== indexToRemove
      );

      setSlideForm({ ...slideForm, images: newImages });
      setImagePreviews(newPreviews);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDeleteConfirm = (
    event: React.MouseEvent,
    slide: HeroSlide
  ) => {
    event.stopPropagation();
    setSlideToDelete(slide);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setSlideToDelete(null);
  };

  const handleDeleteSlide = async () => {
    if (!slideToDelete) return;

    try {
      await axios.delete(`/api/hero/${slideToDelete.id}`);
      handleCloseDeleteConfirm();
      fetchSlides();
    } catch (err) {
      console.error('Failed to delete hero slide:', err);
      setError('히어로 슬라이드 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitSlide = async () => {
    // 입력값 검증
    if (!slideForm.title.trim()) {
      setDialogError('제목은 필수 입력 사항입니다.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', slideForm.title);
      formData.append('subtitle', slideForm.subtitle);
      formData.append('is_active', slideForm.is_active.toString());
      formData.append('display_order', slideForm.display_order.toString());

      // 새로 업로드할 이미지들 추가
      slideForm.images.forEach((image) => {
        formData.append('images', image);
      });

      // 수정 모드인 경우 기존 이미지들도 전달
      if (dialogMode === 'edit' && slideForm.existingImages.length > 0) {
        formData.append(
          'existingImages',
          JSON.stringify(slideForm.existingImages)
        );
      }

      // 이미지 제거 플래그
      if (slideForm.removeImages) {
        formData.append('removeImages', 'true');
      }

      if (dialogMode === 'add') {
        await axios.post('/api/hero', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.put(`/api/hero/${selectedSlide?.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      handleCloseDialog();
      fetchSlides();
    } catch (err) {
      console.error('Failed to submit hero slide:', err);
      setDialogError('히어로 슬라이드 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="hero-admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="hero-admin-container">
      <div className="header-box">
        <h1 className="hero-admin-title">히어로 슬라이드 관리</h1>
        <button className="add-button" onClick={handleOpenAddDialog}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          슬라이드 추가
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>데이터를 불러오는 중...</div>
        </div>
      ) : slides.length === 0 ? (
        <div className="alert alert-info">
          등록된 히어로 슬라이드가 없습니다.
        </div>
      ) : (
        <div className="slides-table-container">
          <table className="slides-table">
            <thead className="slides-table-head">
              <tr>
                <th>ID</th>
                <th>썸네일</th>
                <th>제목</th>
                <th>부제목</th>
                <th>이미지 수</th>
                <th>활성상태</th>
                <th>순서</th>
                <th>등록일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {slides.map((slide) => (
                <tr key={slide.id} className="slides-table-row">
                  <td className="slides-table-cell">{slide.id}</td>
                  <td className="slides-table-cell image-cell">
                    {slide.images && slide.images.length > 0 ? (
                      <div className="image-thumb-container">
                        <img
                          src={slide.images[0]}
                          alt="히어로 이미지"
                          className="image-thumbnail"
                        />
                        {slide.images.length > 1 && (
                          <span className="image-count">
                            +{slide.images.length - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="no-image">없음</span>
                    )}
                  </td>
                  <td className="slides-table-cell slides-title-cell">
                    {slide.title}
                  </td>
                  <td className="slides-table-cell">{slide.subtitle || '-'}</td>
                  <td className="slides-table-cell">
                    {slide.images?.length || 0}개
                  </td>
                  <td className="slides-table-cell">
                    <span
                      className={`status-chip ${slide.is_active ? 'active' : 'inactive'}`}
                    >
                      {slide.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="slides-table-cell">{slide.display_order}</td>
                  <td className="slides-table-cell">
                    {new Date(slide.created_at).toLocaleDateString()}
                  </td>
                  <td className="slides-table-cell">
                    <div className="action-buttons">
                      <button
                        className="action-button edit-button"
                        onClick={() => handleOpenEditDialog(slide)}
                        title="수정"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={(e) => handleOpenDeleteConfirm(e, slide)}
                        title="삭제"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 히어로 슬라이드 추가/수정 다이얼로그 */}
      {openDialog && (
        <div className="dialog">
          <div className="dialog-paper hero-dialog">
            <div className="dialog-title">
              {dialogMode === 'add'
                ? '히어로 슬라이드 추가'
                : '히어로 슬라이드 수정'}
            </div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}

              <div className="form-field">
                <label htmlFor="slide-title">제목</label>
                <input
                  id="slide-title"
                  type="text"
                  className="form-input"
                  value={slideForm.title}
                  onChange={(e) =>
                    setSlideForm({ ...slideForm, title: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="slide-subtitle">부제목</label>
                <input
                  id="slide-subtitle"
                  type="text"
                  className="form-input"
                  value={slideForm.subtitle}
                  onChange={(e) =>
                    setSlideForm({ ...slideForm, subtitle: e.target.value })
                  }
                />
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={slideForm.is_active}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  활성화
                </label>
              </div>

              <div className="form-field">
                <label htmlFor="slide-order">표시 순서</label>
                <input
                  id="slide-order"
                  type="number"
                  className="form-input"
                  value={slideForm.display_order}
                  onChange={(e) =>
                    setSlideForm({
                      ...slideForm,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="form-field image-field">
                <label>이미지 (최대 10개)</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="upload-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreviews.length > 0 ? '이미지 추가' : '이미지 선택'}
                  </button>
                  {imagePreviews.length > 0 && (
                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={handleRemoveImages}
                    >
                      모든 이미지 제거
                    </button>
                  )}
                </div>

                {imagePreviews.length > 0 && (
                  <div className="image-preview-container">
                    <div className="images-grid">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="image-item">
                          <img
                            src={preview}
                            alt={`이미지 ${index + 1}`}
                            className="image-preview"
                          />
                          <button
                            type="button"
                            className="remove-individual-image"
                            onClick={() => handleRemoveIndividualImage(index)}
                            title="이 이미지 제거"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="image-count-text">
                      선택된 이미지: {imagePreviews.length}개
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="save-button"
                onClick={handleSubmitSlide}
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && slideToDelete && (
        <div className="dialog">
          <div className="dialog-paper" style={{ maxWidth: '400px' }}>
            <div className="dialog-title delete-dialog-title">
              히어로 슬라이드 삭제 확인
            </div>
            <div className="dialog-content">
              <p>{slideToDelete.title} 슬라이드를 삭제하시겠습니까?</p>
              <p className="delete-warning">이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                onClick={handleCloseDeleteConfirm}
              >
                취소
              </button>
              <button
                className="delete-confirm-button"
                onClick={handleDeleteSlide}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHero;
