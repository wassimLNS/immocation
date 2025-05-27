import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthProps {
  isOpen: boolean;
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setError('');
    setMessage('');

    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = prompt('Please provide your email for confirmation');
        }
        if (!email) {
          setError('Email not provided. Cannot complete sign-in.');
          return;
        }
        setMessage('Completing sign-in...');
        try {
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          setMessage('Email verified successfully! You can now log in.');
          // We might not want to close the dialog immediately here,
          // user might still need to enter password if not already logged in.
          // onClose(); // Decide if dialog should close

          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err: any) {
          console.error('Error handling email verification link:', err);
          setError('Error verifying email: ' + err.message);
        }
      }
    };

    if (isOpen || isSignInWithEmailLink(auth, window.location.href)) {
       handleEmailLinkSignIn();
    }
  }, [isOpen]);

  useEffect(() => {
    setError('');
    setMessage('');
    setPassword('');
  }, [isLogin]);

  const handleLogin = async () => {
    setError('');
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Email verification check will happen in App.tsx after successful login
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignUp = async () => {
    setError('');
    setMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        setMessage('Sign up successful! A verification email has been sent. Please verify your email to fully activate your account.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error('Error during Google sign-in:', err);
      setError('Error signing in with Google: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{isLogin ? 'Login' : 'Sign Up'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isLogin && (
            <Button 
              variant="text" 
              onClick={handlePasswordReset} 
              sx={{ mt: 1, mb: 2, textTransform: 'none' }}
            >
              Forgot Password?
            </Button>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mb: 2 }}
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            startIcon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/go/colored_transparent_48dp.png" alt="Google icon" style={{ width: 20, height: 20 }} />}
          >
            Sign in with Google
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default Auth; 