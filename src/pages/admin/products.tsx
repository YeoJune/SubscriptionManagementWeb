// src/pages/admin/products.tsx
import React, { useState, useEffect } from 'react';
import './products.css';
import axios from 'axios';
import { ProductProps } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const AdminProducts: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<ProductProps | null>(
    null
  );
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    delivery_count: '1', // 배송 횟수 필드 추가
  });

  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductProps | null>(
    null
  );

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchProducts();
    }
  }, [page, rowsPerPage]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/products', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });

      setProducts(response.data.products);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setProductForm({
      name: '',
      description: '',
      price: '',
      delivery_count: '1', // 기본값 설정
    });
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleOpenEditDialog = (product: ProductProps) => {
    setDialogMode('edit');
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      delivery_count: product.delivery_count
        ? product.delivery_count.toString()
        : '1',
    });
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
  };

  const handleOpenDeleteConfirm = (
    event: React.MouseEvent,
    product: ProductProps
  ) => {
    event.stopPropagation();
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`/api/products/${productToDelete.id}`);
      handleCloseDeleteConfirm();
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      setError('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitProduct = async () => {
    // 입력값 검증
    if (!productForm.name.trim()) {
      setDialogError('상품명을 입력해주세요.');
      return;
    }

    if (
      !productForm.price.trim() ||
      isNaN(Number(productForm.price)) ||
      Number(productForm.price) <= 0
    ) {
      setDialogError('유효한 가격을 입력해주세요.');
      return;
    }

    // 배송 횟수 검증
    if (
      !productForm.delivery_count.trim() ||
      isNaN(Number(productForm.delivery_count)) ||
      Number(productForm.delivery_count) < 1
    ) {
      setDialogError('배송 횟수는 1회 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        delivery_count: Number(productForm.delivery_count),
      };

      if (dialogMode === 'add') {
        await axios.post('/api/products', productData);
      } else {
        await axios.put(`/api/products/${selectedProduct?.id}`, productData);
      }

      handleCloseDialog();
      fetchProducts();
    } catch (err) {
      console.error('Failed to submit product:', err);
      setDialogError('상품 저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
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

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="products-admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="products-admin-container">
      <div className="header-box">
        <h1 className="products-admin-title">상품 관리</h1>

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
          상품 추가
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>데이터를 불러오는 중...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="alert alert-info">등록된 상품이 없습니다.</div>
      ) : (
        <>
          <div className="products-table-container">
            <table className="products-table">
              <thead className="products-table-head">
                <tr>
                  <th>ID</th>
                  <th>상품명</th>
                  <th>설명</th>
                  <th>가격</th>
                  <th>배송 횟수</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="products-table-row">
                    <td className="products-table-cell">{product.id}</td>
                    <td className="products-table-cell">{product.name}</td>
                    <td className="products-table-cell">
                      {product.description}
                    </td>
                    <td className="products-table-cell price-cell">
                      {product.price.toLocaleString()}원
                    </td>
                    <td
                      className="products-table-cell"
                      style={{ textAlign: 'center' }}
                    >
                      <span className="delivery-count-cell">
                        {product.delivery_count || 1}회
                      </span>
                    </td>
                    <td
                      className="products-table-cell"
                      style={{ textAlign: 'center' }}
                    >
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    <td className="products-table-cell">
                      <div className="action-buttons">
                        <button
                          className="action-button edit-button"
                          onClick={() => handleOpenEditDialog(product)}
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
                          onClick={(e) => handleOpenDeleteConfirm(e, product)}
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

      {/* 상품 추가/수정 다이얼로그 */}
      {openDialog && (
        <div className="dialog">
          <div className="dialog-paper">
            <div className="dialog-title">
              {dialogMode === 'add' ? '상품 추가' : '상품 수정'}
            </div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}

              <div className="form-field">
                <label htmlFor="product-name">상품명</label>
                <input
                  id="product-name"
                  type="text"
                  className="form-input"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="product-description">상품 설명</label>
                <textarea
                  id="product-description"
                  className="form-textarea"
                  rows={3}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-field price-field">
                <label htmlFor="product-price">가격</label>
                <input
                  id="product-price"
                  type="number"
                  className="form-input"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                />
              </div>

              <div className="form-field delivery-count-field">
                <label htmlFor="product-delivery-count">배송 횟수</label>
                <input
                  id="product-delivery-count"
                  type="number"
                  className="form-input"
                  value={productForm.delivery_count}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      delivery_count: e.target.value,
                    })
                  }
                />
                <div className="helper-text">
                  상품 구매 시 제공되는 배송 횟수
                </div>
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
                onClick={handleSubmitProduct}
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && productToDelete && (
        <div className="dialog">
          <div className="dialog-paper" style={{ maxWidth: '400px' }}>
            <div className="dialog-title delete-dialog-title">
              상품 삭제 확인
            </div>
            <div className="dialog-content">
              <p>{productToDelete.name} 상품을 삭제하시겠습니까?</p>
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
                onClick={handleDeleteProduct}
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

export default AdminProducts;
