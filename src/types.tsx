// src/types.tsx
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

export interface Board {
  id: number;
  title: string;
  content: string;
  author: User;
  category: 'notice' | 'inquiry' | 'faq' | 'customer-voice';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
