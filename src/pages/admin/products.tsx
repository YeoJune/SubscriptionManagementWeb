// src/pages/admin/products.tsx
import React, { useState, useEffect } from 'react';
import './products.css';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="error">접근 권한이 없습니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 10 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          상품 관리
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          상품 추가
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : products.length === 0 ? (
        <Alert severity="info">등록된 상품이 없습니다.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>상품명</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell align="right">가격</TableCell>
                  <TableCell align="center">배송 횟수</TableCell>
                  <TableCell align="center">등록일</TableCell>
                  <TableCell align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell align="right">
                      {product.price.toLocaleString()}원
                    </TableCell>
                    <TableCell align="center">
                      {product.delivery_count || 1}회
                    </TableCell>
                    <TableCell align="center">
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="수정">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditDialog(product)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton
                          color="error"
                          onClick={(e) => handleOpenDeleteConfirm(e, product)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / 전체 ${count !== -1 ? count : `${to} 이상`}`
            }
          />
        </>
      )}

      {/* 상품 추가/수정 다이얼로그 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? '상품 추가' : '상품 수정'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          <TextField
            label="상품명"
            fullWidth
            margin="normal"
            value={productForm.name}
            onChange={(e) =>
              setProductForm({ ...productForm, name: e.target.value })
            }
          />

          <TextField
            label="상품 설명"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={productForm.description}
            onChange={(e) =>
              setProductForm({ ...productForm, description: e.target.value })
            }
          />

          <TextField
            label="가격"
            fullWidth
            margin="normal"
            type="number"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">₩</InputAdornment>
              ),
            }}
            value={productForm.price}
            onChange={(e) =>
              setProductForm({ ...productForm, price: e.target.value })
            }
          />

          <TextField
            label="배송 횟수"
            fullWidth
            margin="normal"
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">회</InputAdornment>,
            }}
            value={productForm.delivery_count}
            onChange={(e) =>
              setProductForm({ ...productForm, delivery_count: e.target.value })
            }
            helperText="상품 구매 시 제공되는 배송 횟수"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmitProduct}
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>상품 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            {productToDelete?.name} 상품을 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>취소</Button>
          <Button onClick={handleDeleteProduct} color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminProducts;
