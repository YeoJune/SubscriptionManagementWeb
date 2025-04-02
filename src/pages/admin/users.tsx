// pages/admin/users.tsx
import React, { useEffect, useState } from 'react';
import './users.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProductDelivery {
  product_id: number;
  product_name: string;
  remaining_count: number;
}

interface User {
  id: number;
  phone_number: string;
  product_delivery: ProductDelivery[];
  isAdmin: boolean;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
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
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      // 관리자인 경우에만 데이터 로드
      fetchUsers();
    }
  }, [page, isAuthenticated, user]);

  const fetchUsers = () => {
    setLoading(true);
    fetch(`/api/users?page=${page}`, {
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

  // 사용자 행 클릭 시 상세 페이지로 이동
  const handleRowClick = (id: number) => {
    navigate(`/admin/users/${id}`);
  };

  // 배송 횟수에 따른 스타일 클래스 결정
  const getDeliveryCountClass = (count: number) => {
    if (count > 10) return 'delivery-count-high';
    if (count > 5) return 'delivery-count-medium';
    return 'delivery-count-low';
  };

  // 상품별 배송 횟수 합산
  const getTotalDeliveryCount = (
    productDeliveries: ProductDelivery[] | undefined
  ) => {
    if (!productDeliveries || productDeliveries.length === 0) return 0;
    return productDeliveries.reduce(
      (total, product) => total + product.remaining_count,
      0
    );
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
      <h1 className="admin-users-title">사용자 관리</h1>

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
                  <th className="hide-xs">ID</th>
                  <th>전화번호</th>
                  <th>총 배송 횟수</th>
                  <th>관리자 여부</th>
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
                    <td className="users-table-cell">
                      <span
                        className={getDeliveryCountClass(
                          getTotalDeliveryCount(user.product_delivery)
                        )}
                      >
                        {getTotalDeliveryCount(user.product_delivery)}
                      </span>
                    </td>
                    <td className="users-table-cell">
                      {user.isAdmin ? (
                        <span className="admin-badge">관리자</span>
                      ) : (
                        '일반 회원'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <ul className="pagination">{renderPaginationItems()}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminUsers;
