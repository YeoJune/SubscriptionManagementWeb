// src/components/board/placeholder.tsx
import { UserProps, BoardListProps } from '../../types';

// 더미 데이터 (실제 환경에서는 API 등에서 데이터를 가져옵니다)
const dummyUser: UserProps = {
  id: 1,
  name: '홍길동',
  email: 'hong@example.com',
  role: 'customer',
};

const dummyBoards: BoardListProps = {
  boards: [
    {
      id: 1,
      title: '공지사항 예시',
      content: '공지사항 내용입니다.',
      author: dummyUser,
      category: 'notice',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      title: '문의하기 예시',
      content: '1:1 문의 내용입니다.',
      author: dummyUser,
      category: 'inquiry',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      title: 'FAQ 예시',
      content: '자주 묻는 질문 내용입니다.',
      author: dummyUser,
      category: 'faq',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

export { dummyUser, dummyBoards };
