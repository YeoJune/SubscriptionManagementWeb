// src/types.tsx
export interface UserProps {
  id: string;
  phone_number?: string;
  role?: 'admin' | 'customer';
  delivery_count?: number;
}

export interface BoardProps {
  id: number;
  title: string;
  content: string;
  author: UserProps;
  category: 'notice' | 'inquiry' | 'faq' | 'customer-voice';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardListProps {
  boards: BoardProps[];
}

export interface AuthContextProps {
  user: UserProps | null;
  isAuthenticated: boolean;
  login: (
    user: UserProps,
    password: string
  ) => Promise<{ success: boolean; message: string | null }>;
  logout: () => void;
}
