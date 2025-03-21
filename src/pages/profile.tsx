// src/pages/profile.tsx
import React, { useContext } from 'react';
import { Container, Typography } from '@mui/material';
import { AuthContext } from '../components/auth/authProvider';
import UserCard from '../components/userCard';

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  console.log(user);
  console.log(isAuthenticated);

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography variant="h6" align="center">
          로그인 후 접근 가능합니다.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <UserCard user={user} />
    </Container>
  );
};

export default Profile;
