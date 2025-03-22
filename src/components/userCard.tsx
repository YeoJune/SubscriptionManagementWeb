// src/components/userCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Typography,
  Stack,
} from '@mui/material';
import { UserProps } from '../types';

interface UserCardProps {
  user: UserProps;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 500,
        p: 4,
        boxShadow: 4,
        margin: 'auto',
        borderRadius: 3,
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 90,
              height: 90,
              fontSize: 36,
            }}
          >
            {user.id.charAt(0).toUpperCase()}
          </Avatar>
        }
        title={
          <Typography variant="h5" component="div" sx={{ mt: 1 }}>
            {user.id}
          </Typography>
        }
        subheader={
          <Typography variant="subtitle1" color="text.secondary">
            {user.role ? user.role.toUpperCase() : 'ROLE 미정'}
          </Typography>
        }
      />
      <CardContent>
        <Stack spacing={3}>
          {user.phone_number && (
            <Typography variant="body1" sx={{ fontSize: 16 }}>
              전화번호: {user.phone_number}
            </Typography>
          )}
          {typeof user.delivery_count !== 'undefined' && (
            <Typography variant="body1" sx={{ fontSize: 16 }}>
              배달 횟수: {user.delivery_count}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default UserCard;
