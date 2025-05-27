import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from '@mui/material';
import { User } from 'firebase/auth';

interface AccountSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onDeleteAccount: () => Promise<void>;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ isOpen, onClose, user, onDeleteAccount }) => {

  const handleDeleteClick = async () => {
    // Confirmation is already handled in the parent component's handleDeleteAccount
    await onDeleteAccount();
    // Close the dialog after deletion attempt (success or failure handled in parent)
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Account Settings</DialogTitle>
      <DialogContent>
        {user && (
          <Box>
            <Typography variant="h6" gutterBottom>User Information</Typography>
            <Typography variant="body1">Email: {user.email}</Typography>
            {/* Add other user info here if needed */}
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Danger Zone</Typography>
          <Button variant="outlined" color="error" onClick={handleDeleteClick}>
            Delete My Account
          </Button>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Deleting your account is irreversible and will remove all your data.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountSettings; 