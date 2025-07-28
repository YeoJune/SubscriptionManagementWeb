// src/pages/admin/delivery.tsx - 완전한 배송 추가 기능 (달력 포함) + 개별 날짜 수정
import React, { useEffect, useState } from 'react';
import './delivery.css';
import { useAuth } from '../../hooks/useAuth';
import { DeliveryProps } from '../../types';
import DeliveryCalendar from '../../components/DeliveryCalendar';
import axios from 'axios';

interface UserScheduleInfo {
  user: {
    id: string;
    name: string;
    phone_number: string;
    address: string;
  };
  user_products: Array<{
    product_id: number;
    product_name: string;
    remaining_count: number;
  }>;
  scheduled_deliveries: Array<{
    id: number;
    date: string;
    product_id: number;
    product_name: string;
  }>;
  completed_deliveries: Array<{
    id: number;
    date: string;
    product_id: number;
    product_name: string;
  }>;
  total_remaining_deliveries: number;
}

interface SearchUser {
  id: string;
  name: string;
  phone_number: string;
  address: string;
  email: string;
  total_remaining_deliveries: number;
  pending_deliveries: number;
  completed_deliveries: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  delivery_count: number;
}

const Delivery: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toLocaleDateString('sv-SE') // 'sv-SE' 로케일은 YYYY-MM-DD 형식으로 반환
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryProps | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<'complete' | 'cancel'>(
    'complete'
  );

  // 스케줄 관리 관련 상태
  const [activeTab, setActiveTab] = useState<
    'deliveries' | 'schedule' | 'add-delivery'
  >('deliveries');
  const [allUsers, setAllUsers] = useState<SearchUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserScheduleInfo | null>(
    null
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [newScheduleDates, setNewScheduleDates] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);

  // 🆕 개별 배송 날짜 수정 관련 상태
  const [editingDeliveryId, setEditingDeliveryId] = useState<number | null>(
    null
  );
  const [editingDate, setEditingDate] = useState<string>('');
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // 배송 추가 관련 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForDelivery, setSelectedUserForDelivery] =
    useState<string>('');
  const [selectedProductForDelivery, setSelectedProductForDelivery] = useState<
    number | null
  >(null);
  const [selectedDatesForDelivery, setSelectedDatesForDelivery] = useState<
    string[]
  >([]);
  const [specialRequestForDelivery, setSpecialRequestForDelivery] =
    useState<string>('');
  const [deliveryStep, setDeliveryStep] = useState<
    'select-user' | 'select-product' | 'select-dates' | 'confirm'
  >('select-user');

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      if (activeTab === 'deliveries') {
        fetchDeliveries();
      } else if (activeTab === 'schedule' || activeTab === 'add-delivery') {
        fetchAllUsers();
        if (activeTab === 'add-delivery') {
          fetchProducts();
        }
      }
    }
  }, [
    page,
    rowsPerPage,
    filterStatus,
    filterDate,
    activeTab,
    usersPage,
    userSearchTerm,
  ]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterDate) {
        params.date = filterDate;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/delivery', { params });

      setDeliveries(response.data.deliveries);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 목록을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await axios.get('/api/users', {
        params: {
          page: usersPage,
          limit: 10,
          search: userSearchTerm,
        },
      });

      setAllUsers(response.data.users || []);
      setUsersTotal(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setScheduleError('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchDeliveries();
  };

  const handleUserSearch = () => {
    setUsersPage(1);
    fetchAllUsers();
  };

  const handleOpenStatusDialog = (
    delivery: DeliveryProps,
    status: 'complete' | 'cancel'
  ) => {
    setSelectedDelivery(delivery);
    setStatusToUpdate(status);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDelivery(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedDelivery) return;

    try {
      await axios.put(`/api/delivery/${selectedDelivery.id}`, {
        status: statusToUpdate,
      });

      handleCloseDialog();
      fetchDeliveries();
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      setError('배송 상태 변경 중 오류가 발생했습니다.');
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

  const fetchUserSchedule = async (userId: string) => {
    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const response = await axios.get(
        `/api/delivery/users/${userId}/schedule`
      );
      setSelectedUser(response.data);
      setNewScheduleDates([]);
      setSelectedProductId(null);
    } catch (err) {
      console.error('Failed to fetch user schedule:', err);
      setScheduleError('사용자 스케줄을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateUserSchedule = async () => {
    if (!selectedUser || !selectedProductId || newScheduleDates.length === 0) {
      setScheduleError('상품과 배송 날짜를 선택해주세요.');
      return;
    }

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      await axios.put(`/api/delivery/users/${selectedUser.user.id}/schedule`, {
        delivery_dates: newScheduleDates,
        product_id: selectedProductId,
      });

      await fetchUserSchedule(selectedUser.user.id);
      setOpenScheduleDialog(false);
      setNewScheduleDates([]);
      setSelectedProductId(null);
    } catch (err: any) {
      console.error('Failed to update user schedule:', err);
      setScheduleError(
        err.response?.data?.error || '스케줄 업데이트 중 오류가 발생했습니다.'
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  // 🆕 개별 배송 날짜 수정 함수
  const handleOpenEditDialog = (deliveryId: number, currentDate: string) => {
    setEditingDeliveryId(deliveryId);
    setEditingDate(currentDate);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditingDeliveryId(null);
    setEditingDate('');
  };

  const handleUpdateDeliveryDate = async () => {
    if (!selectedUser || !editingDeliveryId || !editingDate) return;

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      await axios.put(
        `/api/delivery/users/${selectedUser.user.id}/schedule/${editingDeliveryId}`,
        { date: editingDate }
      );

      await fetchUserSchedule(selectedUser.user.id);
      handleCloseEditDialog();
    } catch (err: any) {
      console.error('Failed to update delivery date:', err);
      setScheduleError(
        err.response?.data?.error || '배송 날짜 수정 중 오류가 발생했습니다.'
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const deleteScheduledDelivery = async (deliveryId: number) => {
    if (!selectedUser || !confirm('정말로 이 배송 일정을 삭제하시겠습니까?'))
      return;

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      await axios.delete(
        `/api/delivery/users/${selectedUser.user.id}/schedule/${deliveryId}`
      );
      await fetchUserSchedule(selectedUser.user.id);
    } catch (err: any) {
      console.error('Failed to delete delivery:', err);
      setScheduleError(
        err.response?.data?.error || '배송 일정 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const addDeliveryForUser = async () => {
    if (!selectedUserForDelivery || !selectedProductForDelivery) {
      setScheduleError('사용자와 상품을 모두 선택해주세요.');
      return;
    }

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const selectedProduct = products.find(
        (p) => p.id === selectedProductForDelivery
      );
      if (!selectedProduct) {
        throw new Error('선택된 상품을 찾을 수 없습니다.');
      }

      // 새로운 깔끔한 API 사용
      const response = await axios.post('/api/delivery/admin/add-delivery', {
        userId: selectedUserForDelivery,
        productId: selectedProductForDelivery,
        deliveryCount: selectedProduct.delivery_count,
        deliveryDates:
          selectedDatesForDelivery.length > 0 ? selectedDatesForDelivery : null,
        specialRequest: specialRequestForDelivery.trim() || null,
      });

      if (response.data.success) {
        const result = response.data.result;
        const hasSchedule = result.schedule && result.schedule.length > 0;

        alert(
          hasSchedule
            ? `${selectedProduct.name} ${result.added_count}회 배송이 추가되고 ${result.schedule.length}개의 스케줄이 생성되었습니다.`
            : `${selectedProduct.name} ${result.added_count}회 배송이 추가되었습니다. (스케줄은 사용자가 직접 선택)`
        );

        // 배송 추가 후 선택된 사용자의 정보를 실시간 업데이트
        if (selectedUserForDelivery) {
          await fetchUserSchedule(selectedUserForDelivery);
        }

        // 사용자 목록도 업데이트 (배송 횟수 카운트 반영)
        await fetchAllUsers();

        // 초기화
        resetDeliveryProcess();
      }
    } catch (err: any) {
      console.error('Failed to add delivery:', err);
      setScheduleError(
        err.response?.data?.error || '배송 추가 중 오류가 발생했습니다.'
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeliveryStepNext = () => {
    if (deliveryStep === 'select-user' && selectedUserForDelivery) {
      setDeliveryStep('select-product');
    } else if (
      deliveryStep === 'select-product' &&
      selectedProductForDelivery
    ) {
      setDeliveryStep('select-dates');
    } else if (deliveryStep === 'select-dates') {
      setDeliveryStep('confirm');
    }
  };

  const handleDeliveryStepBack = () => {
    if (deliveryStep === 'confirm') {
      setDeliveryStep('select-dates');
    } else if (deliveryStep === 'select-dates') {
      setDeliveryStep('select-product');
    } else if (deliveryStep === 'select-product') {
      setDeliveryStep('select-user');
    }
  };

  const resetDeliveryProcess = () => {
    setSelectedUserForDelivery('');
    setSelectedProductForDelivery(null);
    setSelectedDatesForDelivery([]);
    setSpecialRequestForDelivery('');
    setDeliveryStep('select-user');
  };

  const addScheduleDate = () => {
    const today = new Date().toLocaleDateString('sv-SE'); // 'sv-SE' 로케일은 YYYY-MM-DD 형식으로 반환
    setNewScheduleDates([...newScheduleDates, today]);
  };

  const removeScheduleDate = (index: number) => {
    setNewScheduleDates(newScheduleDates.filter((_, i) => i !== index));
  };

  const updateScheduleDate = (index: number, date: string) => {
    const updated = [...newScheduleDates];
    updated[index] = date;
    setNewScheduleDates(updated);
  };

  // 배송 상태별 색상 및 라벨
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { className: 'status-warning', label: '배송 대기' };
      case 'complete':
        return { className: 'status-success', label: '배송 완료' };
      case 'cancel':
        return { className: 'status-error', label: '배송 취소' };
      default:
        return { className: '', label: status };
    }
  };

  // 🆕 관리자가 선택할 수 있는 모든 요일 옵션 (당일 포함)
  const getAdminAvailableDates = () => {
    const dates = [];
    const today = new Date();

    // 당일부터 60일까지 모든 날짜 허용
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toLocaleDateString('sv-SE'));
    }

    return dates;
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">배송 관리</h1>

      {/* 탭 메뉴 */}
      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          배송 목록
        </button>
        <button
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          스케줄 관리
        </button>
        <button
          className={`tab-button ${activeTab === 'add-delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-delivery')}
        >
          배송 추가
        </button>
      </div>

      {activeTab === 'deliveries' ? (
        // 배송 목록 탭
        <>
          <div className="filter-paper">
            <div className="filter-grid">
              <div className="form-control">
                <label htmlFor="status-filter">배송 상태</label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">전체</option>
                  <option value="pending">배송 대기</option>
                  <option value="complete">배송 완료</option>
                  <option value="cancel">배송 취소</option>
                </select>
              </div>

              <div className="form-control">
                <label htmlFor="date-filter">배송일</label>
                <input
                  id="date-filter"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label htmlFor="search-term">검색</label>
                <input
                  id="search-term"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="이름, 주소 또는 연락처 검색"
                />
              </div>

              <div className="form-control">
                <label htmlFor="search-button">&nbsp;</label>
                <button
                  id="search-button"
                  className="filter-button"
                  onClick={handleSearch}
                >
                  검색
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div>데이터를 불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : deliveries.length === 0 ? (
            <div className="alert alert-info">배송 내역이 없습니다.</div>
          ) : (
            <>
              <div className="table-container">
                <table className="admin-table">
                  <thead className="admin-table-head">
                    <tr>
                      <th>ID</th>
                      <th>사용자</th>
                      <th>배송일</th>
                      <th>상품</th>
                      <th className="hide-xs">연락처</th>
                      <th className="hide-sm">주소</th>
                      <th className="hide-md">요청사항</th>
                      <th style={{ textAlign: 'center' }}>상태</th>
                      <th style={{ textAlign: 'center' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody className="admin-table-body">
                    {deliveries.map((delivery) => {
                      const statusInfo = getStatusInfo(delivery.status);
                      return (
                        <tr key={delivery.id}>
                          <td>{delivery.id}</td>
                          <td>{delivery.user_name || delivery.user_id}</td>
                          <td>
                            {new Date(delivery.date).toLocaleDateString()}
                          </td>
                          <td>{delivery.product_name}</td>
                          <td className="hide-xs">{delivery.phone_number}</td>
                          <td className="hide-sm">{delivery.address}</td>
                          <td className="hide-md">
                            {delivery.special_request ? (
                              <div
                                className="request-preview"
                                title={delivery.special_request}
                              >
                                {delivery.special_request.length > 15
                                  ? `${delivery.special_request.substring(0, 15)}...`
                                  : delivery.special_request}
                              </div>
                            ) : (
                              <span className="no-request">없음</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`status-chip ${statusInfo.className}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {delivery.status === 'pending' && (
                              <div className="action-buttons">
                                <button
                                  className="action-button success-button"
                                  onClick={() =>
                                    handleOpenStatusDialog(delivery, 'complete')
                                  }
                                >
                                  완료
                                </button>
                                <button
                                  className="action-button error-button"
                                  onClick={() =>
                                    handleOpenStatusDialog(delivery, 'cancel')
                                  }
                                >
                                  취소
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination-container">
                <div className="rows-per-page">
                  <span>페이지당 행 수:</span>
                  <select
                    value={rowsPerPage}
                    onChange={handleChangeRowsPerPage}
                  >
                    {[10, 25, 50].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pagination-info">
                  {page * rowsPerPage + 1}-
                  {Math.min((page + 1) * rowsPerPage, total)} / 전체 {total}
                </div>

                <div className="pagination-controls">
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
        </>
      ) : activeTab === 'schedule' ? (
        // 스케줄 관리 탭
        <div className="schedule-management">
          <div className="filter-paper">
            <h3>고객 검색 및 관리</h3>
            <div className="user-search-container">
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                placeholder="이름, 전화번호 또는 ID로 검색 (빈 값이면 전체 조회)"
                className="user-search-input"
              />
              <button
                className="filter-button"
                onClick={handleUserSearch}
                disabled={usersLoading}
              >
                검색
              </button>
            </div>

            {usersLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>고객을 불러오는 중...</div>
              </div>
            ) : (
              <div className="user-search-results">
                <div className="user-list">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="user-card"
                      onClick={() => fetchUserSchedule(user.id)}
                    >
                      <div className="user-info">
                        <strong>{user.name || user.id}</strong> ({user.id})
                        <div className="user-details">
                          <span>{user.phone_number}</span>
                          <span className="delivery-summary">
                            <span className="schedule-info">
                              배송 대기: {user.pending_deliveries || 0}개 / 배송
                              완료: {user.completed_deliveries || 0}개
                            </span>
                            |
                            <span className="remaining-count">
                              잔여 스케쥴:{' '}
                              {user.total_remaining_deliveries || 0}회
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 페이지네이션 */}
                <div className="pagination-container">
                  <div className="pagination-info">
                    페이지 {usersPage} / 전체 고객: {usersTotal}명
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-button"
                      onClick={() => setUsersPage(usersPage - 1)}
                      disabled={usersPage === 1}
                    >
                      이전
                    </button>
                    <button
                      className="pagination-button"
                      onClick={() => setUsersPage(usersPage + 1)}
                      disabled={usersPage * 10 >= usersTotal}
                    >
                      다음
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {scheduleError && (
            <div className="alert alert-error">{scheduleError}</div>
          )}

          {scheduleLoading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div>처리 중...</div>
            </div>
          )}

          {/* 선택된 사용자 스케줄 */}
          {selectedUser && (
            <div className="user-schedule-container">
              <div className="filter-paper">
                <h3>
                  {selectedUser.user.name} ({selectedUser.user.id}) 배송 스케줄
                </h3>

                <div className="user-info-grid">
                  <div>
                    <strong>연락처:</strong> {selectedUser.user.phone_number}
                  </div>
                  <div>
                    <strong>주소:</strong> {selectedUser.user.address}
                  </div>
                  <div>
                    <strong>총 잔여 배송:</strong>{' '}
                    {selectedUser.total_remaining_deliveries}회
                  </div>
                </div>

                <div className="schedule-actions">
                  <button
                    className="filter-button"
                    onClick={() => setOpenScheduleDialog(true)}
                  >
                    스케줄 수정
                  </button>
                </div>
              </div>

              {/* 상품별 잔여 횟수 */}
              <div className="filter-paper">
                <h4>상품별 잔여 배송 횟수</h4>
                <div className="product-grid">
                  {selectedUser.user_products.map((product) => (
                    <div key={product.product_id} className="product-card">
                      <strong>{product.product_name}</strong>
                      <span className="remaining-count-badge">
                        잔여: {product.remaining_count}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 예약된 배송 일정 */}
              <div className="filter-paper">
                <h4>예약된 배송 일정</h4>
                {selectedUser.scheduled_deliveries.length === 0 ? (
                  <p>예약된 배송이 없습니다.</p>
                ) : (
                  <div className="schedule-list">
                    {selectedUser.scheduled_deliveries.map((delivery) => (
                      <div key={delivery.id} className="schedule-item">
                        <div className="schedule-info">
                          <strong>{delivery.date}</strong>
                          <span>{delivery.product_name}</span>
                        </div>
                        <div className="schedule-actions">
                          <button
                            className="action-button edit-button"
                            onClick={() =>
                              handleOpenEditDialog(delivery.id, delivery.date)
                            }
                            title="날짜 수정"
                          >
                            수정
                          </button>
                          <button
                            className="action-button error-button"
                            onClick={() => deleteScheduledDelivery(delivery.id)}
                            title="배송 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 완료된 배송 */}
              <div className="filter-paper">
                <h4>완료된 배송 (최근 5개)</h4>
                {selectedUser.completed_deliveries.length === 0 ? (
                  <p>완료된 배송이 없습니다.</p>
                ) : (
                  <div className="schedule-list">
                    {selectedUser.completed_deliveries
                      .slice(0, 5)
                      .map((delivery) => (
                        <div
                          key={delivery.id}
                          className="schedule-item completed"
                        >
                          <div className="schedule-info">
                            <strong>{delivery.date}</strong>
                            <span>{delivery.product_name}</span>
                          </div>
                          <span className="status-chip status-success">
                            완료
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // 배송 추가 탭
        <div className="add-delivery-management">
          <div className="filter-paper">
            <h3>계좌이체 고객 배송 추가</h3>
            <p className="delivery-add-description">
              계좌이체로 결제한 고객에게 배송을 추가합니다. 배송일을 직접
              선택하거나 나중에 스케줄링할 수 있습니다.
            </p>

            {/* 단계별 진행 표시 */}
            <div className="delivery-steps">
              <div
                className={`step ${deliveryStep === 'select-user' ? 'active' : ''} ${selectedUserForDelivery ? 'completed' : ''}`}
              >
                <span className="step-number">1</span>
                <span className="step-label">고객 선택</span>
              </div>
              <div
                className={`step ${deliveryStep === 'select-product' ? 'active' : ''} ${selectedProductForDelivery ? 'completed' : ''}`}
              >
                <span className="step-number">2</span>
                <span className="step-label">상품 선택</span>
              </div>
              <div
                className={`step ${deliveryStep === 'select-dates' ? 'active' : ''} ${selectedDatesForDelivery.length > 0 ? 'completed' : ''}`}
              >
                <span className="step-number">3</span>
                <span className="step-label">배송일 선택</span>
              </div>
              <div
                className={`step ${deliveryStep === 'confirm' ? 'active' : ''}`}
              >
                <span className="step-number">4</span>
                <span className="step-label">확인</span>
              </div>
            </div>

            {deliveryStep === 'select-user' && (
              <div>
                <h4>1단계: 고객 선택</h4>
                {/* 고객 검색 */}
                <div className="user-search-container">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                    placeholder="이름, 전화번호 또는 ID로 검색 (빈 값이면 전체 조회)"
                    className="user-search-input"
                  />
                  <button
                    className="filter-button"
                    onClick={handleUserSearch}
                    disabled={usersLoading}
                  >
                    검색
                  </button>
                </div>

                {/* 고객 목록 */}
                {usersLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div>고객 목록을 불러오는 중...</div>
                  </div>
                ) : (
                  <div className="users-list-section">
                    <div className="users-grid">
                      {allUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`user-card ${selectedUserForDelivery === user.id ? 'selected' : ''}`}
                          onClick={() => setSelectedUserForDelivery(user.id)}
                        >
                          <div className="user-info">
                            <strong>{user.name || user.id}</strong>
                            <div className="user-id">ID: {user.id}</div>
                            <div className="user-details">
                              <span>{user.phone_number}</span>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 페이지네이션 */}
                    <div className="pagination-container">
                      <div className="pagination-info">
                        페이지 {usersPage} / 전체 고객: {usersTotal}명
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="pagination-button"
                          onClick={() => setUsersPage(usersPage - 1)}
                          disabled={usersPage === 1}
                        >
                          이전
                        </button>
                        <button
                          className="pagination-button"
                          onClick={() => setUsersPage(usersPage + 1)}
                          disabled={usersPage * 10 >= usersTotal}
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {deliveryStep === 'select-product' && (
              <div>
                <h4>2단계: 상품 선택</h4>
                <p className="selected-user-info">
                  선택된 고객:{' '}
                  <strong>
                    {
                      allUsers.find((u) => u.id === selectedUserForDelivery)
                        ?.name
                    }
                  </strong>{' '}
                  ({selectedUserForDelivery})
                </p>
                <div className="product-selection">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`product-card ${selectedProductForDelivery === product.id ? 'selected' : ''}`}
                      onClick={() => setSelectedProductForDelivery(product.id)}
                    >
                      <h5>{product.name}</h5>
                      <p>가격: {product.price.toLocaleString()}원</p>
                      <p>배송 횟수: {product.delivery_count}회</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveryStep === 'select-dates' && selectedProductForDelivery && (
              <div>
                <h4>3단계: 배송일 선택 (선택사항)</h4>
                <p className="selected-info">
                  고객:{' '}
                  <strong>
                    {
                      allUsers.find((u) => u.id === selectedUserForDelivery)
                        ?.name
                    }
                  </strong>
                  <br />
                  상품:{' '}
                  <strong>
                    {
                      products.find((p) => p.id === selectedProductForDelivery)
                        ?.name
                    }
                  </strong>
                </p>
                <p className="date-selection-notice">
                  배송일을 선택하면 해당 날짜에 배송이 예약됩니다. 선택하지
                  않으면 배송 횟수만 추가되고 나중에 스케줄링할 수 있습니다.
                  <br />
                  <strong>관리자는 모든 요일과 당일도 선택 가능합니다.</strong>
                </p>
                <DeliveryCalendar
                  requiredCount={
                    products.find((p) => p.id === selectedProductForDelivery)
                      ?.delivery_count || 0
                  }
                  selectedDates={selectedDatesForDelivery}
                  onDatesChange={setSelectedDatesForDelivery}
                  isAdmin={true}
                />

                {/* 특별 요청사항 입력 */}
                <div className="special-request-section">
                  <h5>특별 요청사항 (선택사항)</h5>
                  <textarea
                    value={specialRequestForDelivery}
                    onChange={(e) =>
                      setSpecialRequestForDelivery(e.target.value)
                    }
                    placeholder="배송 시 특별한 요청사항이 있다면 입력해주세요..."
                    className="special-request-input"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {deliveryStep === 'confirm' && (
              <div>
                <h4>4단계: 최종 확인</h4>
                <div className="delivery-confirmation">
                  <div className="confirm-item">
                    <strong>고객:</strong>{' '}
                    {
                      allUsers.find((u) => u.id === selectedUserForDelivery)
                        ?.name
                    }{' '}
                    ({selectedUserForDelivery})
                  </div>
                  <div className="confirm-item">
                    <strong>상품:</strong>{' '}
                    {
                      products.find((p) => p.id === selectedProductForDelivery)
                        ?.name
                    }
                  </div>
                  <div className="confirm-item">
                    <strong>배송 횟수:</strong>{' '}
                    {
                      products.find((p) => p.id === selectedProductForDelivery)
                        ?.delivery_count
                    }
                    회
                  </div>
                  {selectedDatesForDelivery.length > 0 ? (
                    <div className="confirm-item">
                      <strong>선택된 배송일:</strong>
                      <div className="selected-dates">
                        {selectedDatesForDelivery.map((date) => (
                          <span key={date} className="date-tag">
                            {new Date(date).toLocaleDateString('ko-KR')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="confirm-item">
                      <strong>배송일:</strong> 나중에 스케줄링 (배송 횟수만
                      추가)
                    </div>
                  )}
                  {specialRequestForDelivery.trim() && (
                    <div className="confirm-item">
                      <strong>특별 요청사항:</strong>
                      <div className="special-request-display">
                        {specialRequestForDelivery}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 네비게이션 버튼 */}
            <div className="delivery-navigation">
              <button
                className="back-button"
                onClick={handleDeliveryStepBack}
                disabled={deliveryStep === 'select-user'}
              >
                이전
              </button>

              <button className="reset-button" onClick={resetDeliveryProcess}>
                처음부터
              </button>

              {deliveryStep === 'confirm' ? (
                <button
                  className="confirm-delivery-button"
                  onClick={addDeliveryForUser}
                  disabled={scheduleLoading}
                >
                  {scheduleLoading ? '처리중...' : '배송 추가'}
                </button>
              ) : (
                <button
                  className="next-button"
                  onClick={handleDeliveryStepNext}
                  disabled={
                    (deliveryStep === 'select-user' &&
                      !selectedUserForDelivery) ||
                    (deliveryStep === 'select-product' &&
                      !selectedProductForDelivery)
                  }
                >
                  다음
                </button>
              )}
            </div>
          </div>

          {scheduleError && (
            <div className="alert alert-error">{scheduleError}</div>
          )}
        </div>
      )}

      {/* 상태 변경 확인 다이얼로그 */}
      {openDialog && selectedDelivery && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="modal-title">배송 상태 변경 확인</h2>
            <div className="modal-body">
              <p>
                ID: {selectedDelivery.id}, 사용자:{' '}
                {selectedDelivery.user_name || selectedDelivery.user_id}의 배송
                상태를
                <strong>
                  {' '}
                  {statusToUpdate === 'complete' ? '완료' : '취소'}
                </strong>
                로 변경하시겠습니까?
              </p>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={handleCloseDialog}>
                취소
              </button>
              <button
                className={`confirm-button ${statusToUpdate === 'complete' ? 'confirm-success' : 'confirm-error'}`}
                onClick={handleUpdateStatus}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 개별 배송 날짜 수정 다이얼로그 */}
      {openEditDialog && editingDeliveryId && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="modal-title">배송 날짜 수정</h2>
            <div className="modal-body">
              <div className="form-control">
                <label htmlFor="edit-date">새로운 배송 날짜</label>
                <input
                  id="edit-date"
                  type="date"
                  value={editingDate}
                  onChange={(e) => setEditingDate(e.target.value)}
                  min={new Date().toLocaleDateString('sv-SE')} // 관리자는 당일도 선택 가능
                />
                <small className="form-hint">
                  관리자는 모든 요일과 당일도 선택할 수 있습니다.
                </small>
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={handleCloseEditDialog}>
                취소
              </button>
              <button
                className="confirm-button confirm-success"
                onClick={handleUpdateDeliveryDate}
                disabled={!editingDate || scheduleLoading}
              >
                {scheduleLoading ? '처리중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 수정 다이얼로그 */}
      {openScheduleDialog && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content schedule-dialog">
            <h2 className="modal-title">배송 스케줄 수정</h2>
            <div className="modal-body">
              <div className="form-control">
                <label>상품 선택</label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                >
                  <option value="">상품을 선택하세요</option>
                  {selectedUser.user_products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name} (잔여: {product.remaining_count}회)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label>배송 날짜</label>
                <div className="schedule-dates">
                  {newScheduleDates.map((date, index) => (
                    <div key={index} className="date-input-row">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          updateScheduleDate(index, e.target.value)
                        }
                        min={new Date().toLocaleDateString('sv-SE')} // 관리자는 당일도 선택 가능
                      />
                      <button
                        className="action-button error-button"
                        onClick={() => removeScheduleDate(index)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <button className="action-button" onClick={addScheduleDate}>
                    날짜 추가
                  </button>
                </div>
                <small className="form-hint">
                  관리자는 모든 요일과 당일도 선택할 수 있습니다.
                </small>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setOpenScheduleDialog(false);
                  setNewScheduleDates([]);
                  setSelectedProductId(null);
                }}
              >
                취소
              </button>
              <button
                className="confirm-button confirm-success"
                onClick={updateUserSchedule}
                disabled={!selectedProductId || newScheduleDates.length === 0}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;
