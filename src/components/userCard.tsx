import React from 'react';
import { Card, CardContent, CardHeader, Avatar, Typography, Stack } from '@mui/material';
import { UserProps } from '../types';

interface UserCardProps {
  user: UserProps;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <Card sx={{ maxWidth: 400, margin: 'auto', mt: 4, boxShadow: 3 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {user.id.charAt(0).toUpperCase()}
          </Avatar>
        }
        title={
          <Typography variant="h6" component="div">
            {user.id}
          </Typography>
        }
        subheader={user.role ? user.role.toUpperCase() : 'ROLE 미정'}
      />
      <CardContent>
        <Stack spacing={2}>
          {user.phone_number && (
            <Typography variant="body1">
              전화번호: {user.phone_number}
            </Typography>
          )}
          {typeof user.delivery_count !== 'undefined' && (
            <Typography variant="body1">
              배달 횟수: {user.delivery_count}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default UserCard;
