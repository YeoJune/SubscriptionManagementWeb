// src/pages/profile.tsx
import React, { useContext } from 'react';
import { Container, Typography, Box, Divider } from '@mui/material';
import { AuthContext } from '../components/auth/authProvider';
import UserCard from '../components/userCard';
import ShippingInfo from '../components/shippingInfo';

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Typography variant="h6" align="center">
          로그인 후 접근 가능합니다.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={5}>
        <UserCard user={user} />

        <Divider sx={{ width: '100%', my: 4 }} />

        <ShippingInfo />
      </Box>
    </Container>
  );
};

export default Profile;
