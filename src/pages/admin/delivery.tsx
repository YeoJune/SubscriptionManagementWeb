// src/pages/admin/delivery.tsx - 배송 추가 기능 포함
import React, { useEffect, useState } from 'react';
import './delivery.css';
import { useAuth } from '../../hooks/useAuth';
import { DeliveryProps } from '../../types';
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
  total_deliveries: number;
  pending_deliveries: number;
  completed_deliveries: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
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
    new Date().toISOString().split('T')[0]
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
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
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

  // 배송 추가 관련 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<SearchUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserForDelivery, setSelectedUserForDelivery] =
    useState<string>('');
  const [deliveryCount, setDeliveryCount] = useState<number>(1);
  const [selectedProductForDelivery, setSelectedProductForDelivery] = useState<
    number | null
  >(null);
  const [openAddDeliveryDialog, setOpenAddDeliveryDialog] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      if (activeTab === 'deliveries') {
        fetchDeliveries();
      } else if (activeTab === 'add-delivery') {
        fetchProducts();
        fetchAllUsers();
      }
    }
  }, [page, rowsPerPage, filterStatus, filterDate, activeTab, usersPage]);

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

  // 스케줄 관리 함수들
  const searchUsersForSchedule = async () => {
    if (!userSearchTerm.trim()) return;

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      const response = await axios.get('/api/delivery/users/search', {
        params: { q: userSearchTerm },
      });
      setSearchUsers(response.data.users);
    } catch (err) {
      console.error('Failed to search users:', err);
      setScheduleError('사용자 검색 중 오류가 발생했습니다.');
    } finally {
      setScheduleLoading(false);
    }
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

      // 스케줄 업데이트 후 다시 조회
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

  // 배송 추가 함수들
  const addDeliveryCount = async () => {
    if (
      !selectedUserForDelivery ||
      !selectedProductForDelivery ||
      deliveryCount < 1
    ) {
      setScheduleError('사용자, 상품, 배송 횟수를 모두 선택해주세요.');
      return;
    }

    setScheduleLoading(true);
    setScheduleError(null);

    try {
      // 기존 사용자 정보 조회
      const userResponse = await axios.get(
        `/api/users/${selectedUserForDelivery}`
      );
      const userData = userResponse.data;

      // 기존 product_deliveries 가져오기
      const existingDeliveries = userData.product_deliveries || [];

      // 해당 상품의 기존 배송 횟수 찾기
      const existingProduct = existingDeliveries.find(
        (pd: any) => pd.product_id === selectedProductForDelivery
      );

      const newRemainingCount = existingProduct
        ? existingProduct.remaining_count + deliveryCount
        : deliveryCount;

      // product_deliveries 배열 업데이트
      const updatedProductDeliveries = existingDeliveries.filter(
        (pd: any) => pd.product_id !== selectedProductForDelivery
      );

      updatedProductDeliveries.push({
        product_id: selectedProductForDelivery,
        remaining_count: newRemainingCount,
      });

      // 사용자 정보 업데이트
      await axios.put(`/api/users/${selectedUserForDelivery}`, {
        ...userData,
        product_deliveries: updatedProductDeliveries,
      });

      setOpenAddDeliveryDialog(false);
      setSelectedUserForDelivery('');
      setSelectedProductForDelivery(null);
      setDeliveryCount(1);

      alert(`배송 횟수가 성공적으로 추가되었습니다. (${deliveryCount}회 추가)`);
    } catch (err: any) {
      console.error('Failed to add delivery count:', err);
      setScheduleError(
        err.response?.data?.error || '배송 횟수 추가 중 오류가 발생했습니다.'
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const addScheduleDate = () => {
    const today = new Date().toISOString().split('T')[0];
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
        // 기존 배송 목록 탭
        <>
          {/* 필터 및 검색 */}
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
          {/* 모든 사용자 목록 */}
          <div className="filter-paper">
            <h3>전체 사용자 목록</h3>
            <div className="user-search-container">
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setUsersPage(1);
                    fetchAllUsers();
                  }
                }}
                placeholder="이름, 전화번호 또는 ID로 검색"
                className="user-search-input"
              />
              <button
                className="filter-button"
                onClick={() => {
                  setUsersPage(1);
                  fetchAllUsers();
                }}
                disabled={usersLoading}
              >
                검색
              </button>
            </div>

            {usersLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div>사용자를 불러오는 중...</div>
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
                          <span>
                            배송: {user.pending_deliveries || 0}대기 /{' '}
                            {user.completed_deliveries || 0}완료
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 사용자 목록 페이지네이션 */}
                <div className="pagination-container">
                  <div className="pagination-info">
                    페이지 {usersPage} / 전체 사용자: {usersTotal}명
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

            {/* 사용자 검색 */}
            <div style={{ marginTop: '2rem' }}>
              <h4>특정 사용자 검색</h4>
              <div className="user-search-container">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && searchUsersForSchedule()
                  }
                  placeholder="이름, 전화번호 또는 ID로 검색"
                  className="user-search-input"
                />
                <button
                  className="filter-button"
                  onClick={searchUsersForSchedule}
                  disabled={scheduleLoading}
                >
                  검색
                </button>
              </div>

              {searchUsers.length > 0 && (
                <div className="user-search-results">
                  <h4>검색 결과</h4>
                  <div className="user-list">
                    {searchUsers.map((user) => (
                      <div
                        key={user.id}
                        className="user-card"
                        onClick={() => fetchUserSchedule(user.id)}
                      >
                        <div className="user-info">
                          <strong>{user.name}</strong> ({user.id})
                          <div className="user-details">
                            <span>{user.phone_number}</span>
                            <span>
                              배송: {user.pending_deliveries}대기 /{' '}
                              {user.completed_deliveries}완료
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                        <button
                          className="action-button error-button"
                          onClick={() => deleteScheduledDelivery(delivery.id)}
                        >
                          삭제
                        </button>
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
            <h3>계좌이체 고객 배송 횟수 추가</h3>
            <p className="delivery-add-description">
              계좌이체로 결제한 고객에게 배송 횟수를 추가할 수 있습니다.
            </p>

            <div className="delivery-add-form">
              <div className="form-control">
                <label>고객 선택</label>
                <select
                  value={selectedUserForDelivery}
                  onChange={(e) => setSelectedUserForDelivery(e.target.value)}
                >
                  <option value="">고객을 선택하세요</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.id} ({user.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label>상품 선택</label>
                <select
                  value={selectedProductForDelivery || ''}
                  onChange={(e) =>
                    setSelectedProductForDelivery(Number(e.target.value))
                  }
                >
                  <option value="">상품을 선택하세요</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.price.toLocaleString()}원)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label>추가할 배송 횟수</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={deliveryCount}
                  onChange={(e) => setDeliveryCount(Number(e.target.value))}
                />
              </div>

              <div className="form-actions">
                <button
                  className="filter-button"
                  onClick={() => setOpenAddDeliveryDialog(true)}
                  disabled={
                    !selectedUserForDelivery ||
                    !selectedProductForDelivery ||
                    deliveryCount < 1
                  }
                >
                  배송 횟수 추가
                </button>
              </div>
            </div>

            {/* 고객 목록 */}
            <div className="users-list-section">
              <h4>전체 고객 목록</h4>
              <div className="user-search-container">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      setUsersPage(1);
                      fetchAllUsers();
                    }
                  }}
                  placeholder="이름, 전화번호 또는 ID로 검색"
                  className="user-search-input"
                />
                <button
                  className="filter-button"
                  onClick={() => {
                    setUsersPage(1);
                    fetchAllUsers();
                  }}
                  disabled={usersLoading}
                >
                  검색
                </button>
              </div>

              {usersLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <div>고객 목록을 불러오는 중...</div>
                </div>
              ) : (
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
              )}

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

      {/* 배송 추가 확인 다이얼로그 */}
      {openAddDeliveryDialog && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="modal-title">배송 횟수 추가 확인</h2>
            <div className="modal-body">
              <p>
                <strong>고객:</strong>{' '}
                {allUsers.find((u) => u.id === selectedUserForDelivery)?.name} (
                {selectedUserForDelivery})
              </p>
              <p>
                <strong>상품:</strong>{' '}
                {
                  products.find((p) => p.id === selectedProductForDelivery)
                    ?.name
                }
              </p>
              <p>
                <strong>추가할 배송 횟수:</strong> {deliveryCount}회
              </p>
              <br />
              <p>위 정보로 배송 횟수를 추가하시겠습니까?</p>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setOpenAddDeliveryDialog(false)}
              >
                취소
              </button>
              <button
                className="confirm-button confirm-success"
                onClick={addDeliveryCount}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;
