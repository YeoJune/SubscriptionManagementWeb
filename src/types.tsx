// src/types.tsx
export interface UserProps {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
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
  login: (username: string, password: string) => Promise<void>
  logout: () => void;
};
