// pages/admin/users.tsx
import React, { useEffect, useState } from 'react';
import './users.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: string; // API에서 TEXT로 반환
  name?: string;
  phone_number: string;
  email?: string;
  address?: string;
  total_delivery_count: number;
  card_payment_allowed: boolean;
  created_at: string;
  last_login?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

interface ApiResponse {
  users: User[];
  pagination: PaginationInfo;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchUsers();
    }
  }, [page, searchTerm, sortBy, order, isAuthenticated, user]);

  const fetchUsers = () => {
    setLoading(true);

    // URL 파라미터 구성
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10',
      ...(searchTerm && { search: searchTerm }),
      ...(sortBy && { sortBy }),
      ...(order && { order }),
    });

    fetch(`/api/users?${params}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '사용자 정보를 불러오지 못했습니다.');
        }
        return res.json();
      })
      .then((data: ApiResponse) => {
        setUsers(data.users);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // 검색 시 첫 페이지로
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('asc');
    }
    setPage(1);
  };

  // 사용자 행 클릭 시 상세 페이지로 이동
  const handleRowClick = (id: string) => {
    navigate(`/admin/users/${id}`);
  };

  // 카드 결제 허용 여부 토글
  const handleToggleCardPayment = async (userId: string, newValue: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          card_payment_allowed: newValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '카드 결제 설정 변경에 실패했습니다.');
      }

      // 성공 시 목록 새로고침
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 배송 횟수에 따른 스타일 클래스 결정
  const getDeliveryCountClass = (count: number) => {
    if (count > 10) return 'delivery-count-high';
    if (count > 5) return 'delivery-count-medium';
    return 'delivery-count-low';
  };

  // 인증 및 권한 검사
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="admin-users-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  // 페이지네이션 아이템 생성
  const renderPaginationItems = () => {
    const items = [];
    const { currentPage, totalPages } = pagination;

    // 처음 페이지
    if (currentPage > 2) {
      items.push(
        <li
          key="first"
          className="pagination-item"
          onClick={() => handlePageChange(1)}
        >
          1
        </li>
      );

      if (currentPage > 3) {
        items.push(
          <li key="ellipsis1" className="pagination-item">
            ...
          </li>
        );
      }
    }

    // 이전 페이지
    if (currentPage > 1) {
      items.push(
        <li
          key={currentPage - 1}
          className="pagination-item"
          onClick={() => handlePageChange(currentPage - 1)}
        >
          {currentPage - 1}
        </li>
      );
    }

    // 현재 페이지
    items.push(
      <li key={currentPage} className="pagination-item active">
        {currentPage}
      </li>
    );

    // 다음 페이지
    if (currentPage < totalPages) {
      items.push(
        <li
          key={currentPage + 1}
          className="pagination-item"
          onClick={() => handlePageChange(currentPage + 1)}
        >
          {currentPage + 1}
        </li>
      );
    }

    // 마지막 페이지
    if (currentPage < totalPages - 1) {
      if (currentPage < totalPages - 2) {
        items.push(
          <li key="ellipsis2" className="pagination-item">
            ...
          </li>
        );
      }

      items.push(
        <li
          key={totalPages}
          className="pagination-item"
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </li>
      );
    }

    return items;
  };

  return (
    <div className="admin-users-container">
      <div className="header-section">
        <h1 className="admin-users-title">사용자 관리</h1>

        {/* 검색 및 정렬 */}
        <div className="controls-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="ID, 이름, 전화번호, 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              검색
            </button>
          </form>
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>데이터를 불러오는 중...</div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead className="users-table-head">
                <tr>
                  <th
                    className="hide-xs sortable"
                    onClick={() => handleSort('id')}
                  >
                    ID {sortBy === 'id' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('phone_number')}
                  >
                    전화번호{' '}
                    {sortBy === 'phone_number' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="hide-sm">이름</th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('total_delivery_count')}
                  >
                    총 배송 횟수{' '}
                    {sortBy === 'total_delivery_count' &&
                      (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('card_payment_allowed')}
                  >
                    카드결제{' '}
                    {sortBy === 'card_payment_allowed' &&
                      (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="hide-xs sortable"
                    onClick={() => handleSort('created_at')}
                  >
                    가입일{' '}
                    {sortBy === 'created_at' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="users-table-row"
                    onClick={() => handleRowClick(user.id)}
                  >
                    <td className="users-table-cell hide-xs">{user.id}</td>
                    <td className="users-table-cell">{user.phone_number}</td>
                    <td className="users-table-cell hide-sm">
                      {user.name || '-'}
                    </td>
                    <td className="users-table-cell">
                      <span
                        className={getDeliveryCountClass(
                          user.total_delivery_count
                        )}
                      >
                        {user.total_delivery_count}
                      </span>
                    </td>
                    <td className="users-table-cell">
                      <input
                        type="checkbox"
                        className="card-payment-checkbox"
                        checked={user.card_payment_allowed}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleCardPayment(user.id, e.target.checked);
                        }}
                        title={`카드 결제 ${user.card_payment_allowed ? '허용됨' : '차단됨'}`}
                      />
                    </td>
                    <td className="users-table-cell hide-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">
                총 {pagination.total}명 중{' '}
                {(pagination.currentPage - 1) * pagination.limit + 1}-
                {Math.min(
                  pagination.currentPage * pagination.limit,
                  pagination.total
                )}
                명 표시
              </div>
              <ul className="pagination">{renderPaginationItems()}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminUsers;
