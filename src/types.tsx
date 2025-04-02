// src/types.tsx
export interface ProductDelivery {
  product_id: number;
  product_name: string;
  remaining_count: number;
}

export interface UserProps {
  id: string;
  name?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  isAdmin?: boolean;
  delivery_count?: number; // 호환성을 위해 유지, 더 이상 직접 사용하지 않음
  product_delivery?: ProductDelivery[]; // 상품별 배송 잔여 횟수 정보
  created_at?: string;
  last_login?: string;
  total_delivery_count?: number; // 전체 배송 잔여 횟수
}

export interface AuthResponse {
  user: UserProps;
  product_delivery: ProductDelivery[];
}

export interface BoardProps {
  id: number;
  title: string;
  content: string;
  author?: UserProps;
  category: 'normal' | 'faq';
  type?: 'normal' | 'faq';
  question?: string;
  answer?: string;
  createdAt: Date;
  created_at?: string;
}

export interface InquiryProps {
  id: number;
  user_id: string;
  user_name?: string;
  title: string;
  content: string;
  answer?: string;
  status: 'answered' | 'unanswered';
  created_at: string;
  answered_at?: string;
  createdAt?: Date; // 프론트엔드용 변환 날짜
}

export interface ProductProps {
  id: number;
  name: string;
  description: string;
  price: number;
  delivery_count: number;
  created_at: string;
}

export interface PaymentProps {
  id: number;
  product_id: number;
  count: number;
  amount: number;
  created_at: string;
  product_name?: string;
}

export interface DeliveryProps {
  id: number;
  user_id: string;
  user_name?: string;
  status: 'pending' | 'complete' | 'cancel';
  date: string;
  product_id: number;
  product_name?: string;
  phone_number?: string;
  address?: string;
  remaining_count_for_product?: number; // 해당 상품의 남은 배송 횟수
}

export interface BoardListProps {
  boards: BoardProps[];
  onBoardClick: (board: BoardProps) => void;
}

export interface InquiryListProps {
  inquiries: InquiryProps[];
  onInquiryClick: (inquiry: InquiryProps) => void;
}

export interface AuthContextProps {
  user: UserProps | null;
  isAuthenticated: boolean;
  login: (
    id: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

export interface PaginationProps {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
}
