// src/pages/admin/notices.tsx
import React, { useState, useEffect, useRef } from 'react';
import './notices.css';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface NoticeProps {
  id: number;
  type: 'normal' | 'faq';
  title: string;
  content?: string;
  question?: string;
  answer?: string;
  image_path?: string;
  created_at: string;
}

const AdminNotices: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [notices, setNotices] = useState<NoticeProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // 다이얼로그 상태
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedNotice, setSelectedNotice] = useState<NoticeProps | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // 이미지 업로드를 위한 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 공지사항 폼 상태
  const [noticeForm, setNoticeForm] = useState({
    type: 'normal' as 'normal' | 'faq',
    title: '',
    content: '',
    question: '',
    answer: '',
    image: null as File | null,
    removeImage: false,
  });

  // 삭제 확인 다이얼로그 상태
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeProps | null>(
    null
  );

  // 이미지 미리보기 URL
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchNotices();
    }
  }, [page, rowsPerPage, filterType]);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterType !== 'all') {
        params.type = filterType;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/notices', { params });

      setNotices(response.data.notices);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setError('공지사항을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setNoticeForm({
      type: 'normal',
      title: '',
      content: '',
      question: '',
      answer: '',
      image: null,
      removeImage: false,
    });
    setImagePreview(null);
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleOpenEditDialog = (notice: NoticeProps) => {
    setDialogMode('edit');
    setSelectedNotice(notice);
    setNoticeForm({
      type: notice.type,
      title: notice.title,
      content: notice.content || '',
      question: notice.question || '',
      answer: notice.answer || '',
      image: null,
      removeImage: false,
    });
    setImagePreview(notice.image_path ? `${notice.image_path}` : null);
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedNotice(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNoticeForm({ ...noticeForm, image: file });

    // 이미지 미리보기 생성
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setNoticeForm({ ...noticeForm, image: null, removeImage: true });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDeleteConfirm = (
    event: React.MouseEvent,
    notice: NoticeProps
  ) => {
    event.stopPropagation();
    setNoticeToDelete(notice);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setNoticeToDelete(null);
  };

  const handleDeleteNotice = async () => {
    if (!noticeToDelete) return;

    try {
      await axios.delete(`/api/notices/${noticeToDelete.id}`);
      handleCloseDeleteConfirm();
      fetchNotices();
    } catch (err) {
      console.error('Failed to delete notice:', err);
      setError('공지사항 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitNotice = async () => {
    // 입력값 검증
    if (!noticeForm.title.trim()) {
      setDialogError('제목은 필수 입력 사항입니다.');
      return;
    }

    if (noticeForm.type === 'normal' && !noticeForm.content.trim()) {
      setDialogError('일반 공지의 경우 내용은 필수 입력 사항입니다.');
      return;
    }

    if (
      noticeForm.type === 'faq' &&
      (!noticeForm.question.trim() || !noticeForm.answer.trim())
    ) {
      setDialogError('FAQ의 경우 질문과 답변은 필수 입력 사항입니다.');
      return;
    }

    setSubmitting(true);

    try {
      // FormData 객체 생성
      const formData = new FormData();
      formData.append('type', noticeForm.type);
      formData.append('title', noticeForm.title);

      if (noticeForm.type === 'normal') {
        formData.append('content', noticeForm.content);
      } else {
        formData.append('question', noticeForm.question);
        formData.append('answer', noticeForm.answer);
      }

      // 이미지 처리
      if (noticeForm.image) {
        formData.append('image', noticeForm.image);
      }

      // 이미지 제거 플래그
      if (noticeForm.removeImage) {
        formData.append('removeImage', 'true');
      }

      if (dialogMode === 'add') {
        await axios.post('/api/notices', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await axios.put(`/api/notices/${selectedNotice?.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      handleCloseDialog();
      fetchNotices();
    } catch (err) {
      console.error('Failed to submit notice:', err);
      setDialogError('공지사항 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchNotices();
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 공지 타입에 따른 라벨
  const getTypeLabel = (type: string) => {
    return type === 'normal' ? '일반 공지' : 'FAQ';
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="notices-admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="notices-admin-container">
      <div className="header-box">
        <h1 className="notices-admin-title">공지사항 관리</h1>

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
          공지사항 추가
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="filter-box">
        <div className="filter-row">
          <div className="filter-group">
            <select
              className="filter-select"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">전체</option>
              <option value="normal">일반 공지</option>
              <option value="faq">FAQ</option>
            </select>
          </div>

          <div className="search-field">
            <input
              type="text"
              className="search-input"
              placeholder="제목 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-button" onClick={handleSearch}>
              검색
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>데이터를 불러오는 중...</div>
        </div>
      ) : notices.length === 0 ? (
        <div className="alert alert-info">등록된 공지사항이 없습니다.</div>
      ) : (
        <>
          <div className="notices-table-container">
            <table className="notices-table">
              <thead className="notices-table-head">
                <tr>
                  <th>ID</th>
                  <th>타입</th>
                  <th>제목</th>
                  <th>이미지</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr key={notice.id} className="notices-table-row">
                    <td className="notices-table-cell">{notice.id}</td>
                    <td className="notices-table-cell">
                      <span className={`type-chip ${notice.type}-type`}>
                        {getTypeLabel(notice.type)}
                      </span>
                    </td>
                    <td className="notices-table-cell notices-title-cell">
                      {notice.title}
                    </td>
                    <td className="notices-table-cell image-cell">
                      {notice.image_path ? (
                        <div className="image-thumb-container">
                          <img
                            src={notice.image_path}
                            alt="공지 이미지"
                            className="image-thumbnail"
                          />
                        </div>
                      ) : (
                        <span className="no-image">없음</span>
                      )}
                    </td>
                    <td className="notices-table-cell">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </td>
                    <td className="notices-table-cell">
                      <div className="action-buttons">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleOpenEditDialog(notice)}
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
                          onClick={(e) => handleOpenDeleteConfirm(e, notice)}
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

          <div className="pagination-container">
            <span className="pagination-text">페이지당 행 수:</span>
            <select
              className="pagination-select"
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
            >
              {[10, 25, 50].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="pagination-text">
              {page * rowsPerPage + 1}-
              {Math.min((page + 1) * rowsPerPage, total)} / 전체 {total}
            </span>
            <div className="pagination-buttons">
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                이전
              </button>
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page + 1)}
                disabled={(page + 1) * rowsPerPage >= total}
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      {/* 공지사항 추가/수정 다이얼로그 */}
      {openDialog && (
        <div className="dialog">
          <div className="dialog-paper notice-dialog">
            <div className="dialog-title">
              {dialogMode === 'add' ? '공지사항 추가' : '공지사항 수정'}
            </div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}

              <div className="form-field type-field">
                <label>공지 타입</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="notice-type"
                      value="normal"
                      checked={noticeForm.type === 'normal'}
                      onChange={() =>
                        setNoticeForm({ ...noticeForm, type: 'normal' })
                      }
                    />
                    일반 공지
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="notice-type"
                      value="faq"
                      checked={noticeForm.type === 'faq'}
                      onChange={() =>
                        setNoticeForm({ ...noticeForm, type: 'faq' })
                      }
                    />
                    FAQ
                  </label>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="notice-title">제목</label>
                <input
                  id="notice-title"
                  type="text"
                  className="form-input"
                  value={noticeForm.title}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, title: e.target.value })
                  }
                />
              </div>

              {noticeForm.type === 'normal' ? (
                <div className="form-field">
                  <label htmlFor="notice-content">내용</label>
                  <textarea
                    id="notice-content"
                    className="form-textarea"
                    rows={10}
                    value={noticeForm.content}
                    onChange={(e) =>
                      setNoticeForm({ ...noticeForm, content: e.target.value })
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label htmlFor="notice-question">질문</label>
                    <textarea
                      id="notice-question"
                      className="form-textarea"
                      rows={3}
                      value={noticeForm.question}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          question: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="notice-answer">답변</label>
                    <textarea
                      id="notice-answer"
                      className="form-textarea"
                      rows={6}
                      value={noticeForm.answer}
                      onChange={(e) =>
                        setNoticeForm({ ...noticeForm, answer: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div className="form-field image-field">
                <label>이미지</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="upload-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    이미지 선택
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={handleRemoveImage}
                    >
                      이미지 제거
                    </button>
                  )}
                </div>

                {imagePreview && (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="이미지 미리보기"
                      className="image-preview"
                    />
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
                onClick={handleSubmitNotice}
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && noticeToDelete && (
        <div className="dialog">
          <div className="dialog-paper" style={{ maxWidth: '400px' }}>
            <div className="dialog-title delete-dialog-title">
              공지사항 삭제 확인
            </div>
            <div className="dialog-content">
              <p>{noticeToDelete.title} 공지사항을 삭제하시겠습니까?</p>
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
                onClick={handleDeleteNotice}
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

export default AdminNotices;
