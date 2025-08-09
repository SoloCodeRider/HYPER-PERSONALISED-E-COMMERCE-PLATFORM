import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import toast from 'react-hot-toast';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Set auth token in axios headers
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,
  registrationStep: 1,
  passwordResetEmail: null,
  emailVerificationSent: false,
  loginAttempts: 0,
  lastLoginAttempt: null,
  preferences: {
    notifications: {
      email: true,
      push: true,
      sms: false,
      promotions: true
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analyticsOptIn: true
    }
  }
};

// Async thunks

// Register user
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/register', userData);
      
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      
      toast.success('Registration successful! Welcome to our store!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      
      // Check for rate limiting
      if (state.auth.loginAttempts >= 5) {
        const lastAttempt = new Date(state.auth.lastLoginAttempt);
        const now = new Date();
        const timeDiff = now - lastAttempt;
        const waitTime = 15 * 60 * 1000; // 15 minutes
        
        if (timeDiff < waitTime) {
          const remainingTime = Math.ceil((waitTime - timeDiff) / 60000);
          throw new Error(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
        }
      }
      
      const response = await axios.post('/auth/login', credentials);
      
      if (response.data.token) {
        setAuthToken(response.data.token);
      }
      
      toast.success(`Welcome back, ${response.data.user.firstName}!`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await axios.post('/auth/logout');
      setAuthToken(null);
      toast.success('Logged out successfully');
      return {};
    } catch (error) {
      // Even if logout fails on server, clear local data
      setAuthToken(null);
      return {};
    }
  }
);

// Load user from token
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      setAuthToken(token);
      const response = await axios.get('/auth/me');
      return { user: response.data, token };
    } catch (error) {
      setAuthToken(null);
      const message = error.response?.data?.message || 'Failed to load user';
      return rejectWithValue(message);
    }
  }
);

// Update user profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Change password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      await axios.put('/auth/change-password', passwordData);
      toast.success('Password changed successfully!');
      return {};
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Forgot password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      await axios.post('/auth/forgot-password', { email });
      toast.success('Password reset email sent!');
      return { email };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Reset password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      await axios.post('/auth/reset-password', { token, password });
      toast.success('Password reset successful! Please login with your new password.');
      return {};
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Verify email
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.post('/auth/verify-email', { token });
      toast.success('Email verified successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Resend verification email
export const resendVerificationEmail = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (_, { rejectWithValue }) => {
    try {
      await axios.post('/auth/resend-verification');
      toast.success('Verification email sent!');
      return {};
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send verification email';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Update user preferences
export const updatePreferences = createAsyncThunk(
  'auth/updatePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await axios.put('/auth/preferences', preferences);
      toast.success('Preferences updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update preferences';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Delete account
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (password, { rejectWithValue }) => {
    try {
      await axios.delete('/auth/account', { data: { password } });
      setAuthToken(null);
      toast.success('Account deleted successfully');
      return {};
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete account';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRegistrationStep: (state, action) => {
      state.registrationStep = action.payload;
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.lastLoginAttempt = null;
    },
    updateUserData: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setEmailVerificationSent: (state, action) => {
      state.emailVerificationSent = action.payload;
    },
    updateLocalPreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    clearAuthState: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
      setAuthToken(null);
    }
  },
  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = !!action.payload.token;
        state.error = null;
        state.registrationStep = 1;
        state.emailVerificationSent = !action.payload.user.isVerified;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.loginAttempts = 0;
        state.lastLoginAttempt = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loginAttempts += 1;
        state.lastLoginAttempt = new Date().toISOString();
      })
      
      // Logout user
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.loading = false;
        state.loginAttempts = 0;
        state.lastLoginAttempt = null;
      })
      
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload };
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Forgot password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.passwordResetEmail = action.payload.email;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reset password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.passwordResetEmail = null;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Verify email
      .addCase(verifyEmail.fulfilled, (state, action) => {
        if (state.user) {
          state.user.isVerified = true;
        }
        state.emailVerificationSent = false;
      })
      
      // Resend verification email
      .addCase(resendVerificationEmail.fulfilled, (state) => {
        state.emailVerificationSent = true;
      })
      
      // Update preferences
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
        if (state.user) {
          state.user.preferences = { ...state.user.preferences, ...action.payload };
        }
      })
      
      // Delete account
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.loading = false;
      });
  }
});

// Export actions
export const {
  clearError,
  setRegistrationStep,
  resetLoginAttempts,
  updateUserData,
  setEmailVerificationSent,
  updateLocalPreferences,
  clearAuthState
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectUserPreferences = (state) => state.auth.preferences;
export const selectIsEmailVerified = (state) => state.auth.user?.isVerified || false;
export const selectMembershipTier = (state) => state.auth.user?.membershipTier || 'bronze';
export const selectLoyaltyPoints = (state) => state.auth.user?.loyaltyPoints || 0;

// Export reducer
export default authSlice.reducer;

// Utility functions
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getUserRole = (user) => {
  return user?.role || 'customer';
};

export const hasPermission = (user, permission) => {
  const role = getUserRole(user);
  const permissions = {
    customer: ['view_products', 'create_orders', 'view_own_orders'],
    admin: ['*'], // All permissions
    moderator: ['view_products', 'create_orders', 'view_own_orders', 'moderate_content']
  };
  
  return permissions[role]?.includes('*') || permissions[role]?.includes(permission);
};