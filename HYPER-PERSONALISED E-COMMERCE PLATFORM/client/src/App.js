import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Redux Store
import store from './store/store';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ErrorBoundary from './components/UI/ErrorBoundary';
import ChatBot from './components/AI/ChatBot';
import NotificationSystem from './components/Notifications/NotificationSystem';
import ARTryOnModal from './components/AR/ARTryOnModal';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';

// Lazy loaded pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const Search = lazy(() => import('./pages/Search'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/Admin/Products'));
const AdminOrders = lazy(() => import('./pages/Admin/Orders'));
const AdminUsers = lazy(() => import('./pages/Admin/Users'));
const AdminAnalytics = lazy(() => import('./pages/Admin/Analytics'));

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && (!user || user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Loading component for Suspense
const PageLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="60vh"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CircularProgress size={60} thickness={4} />
    </motion.div>
  </Box>
);

// Main App Component
function App() {
  const { themeMode, toggleTheme } = useTheme();
  const { initializeNotifications } = useNotifications();
  
  // Create MUI theme based on user preference
  const theme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#2563eb',
        light: '#3b82f6',
        dark: '#1d4ed8',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#7c3aed',
        light: '#8b5cf6',
        dark: '#6d28d9',
        contrastText: '#ffffff'
      },
      background: {
        default: themeMode === 'dark' ? '#0f172a' : '#ffffff',
        paper: themeMode === 'dark' ? '#1e293b' : '#ffffff'
      },
      text: {
        primary: themeMode === 'dark' ? '#f1f5f9' : '#0f172a',
        secondary: themeMode === 'dark' ? '#cbd5e1' : '#475569'
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
        lineHeight: 1.3
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6
      },
      button: {
        textTransform: 'none',
        fontWeight: 500
      }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.95rem',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: themeMode === 'dark' 
              ? '0 4px 20px rgba(0,0,0,0.3)' 
              : '0 4px 20px rgba(0,0,0,0.08)',
            border: themeMode === 'dark' ? '1px solid #334155' : 'none'
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8
            }
          }
        }
      }
    }
  });

  // Initialize app services
  useEffect(() => {
    initializeNotifications();
    
    // Initialize analytics
    if (process.env.REACT_APP_GA_ID) {
      // Google Analytics initialization would go here
    }
    
    // Service worker registration for PWA features
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, [initializeNotifications]);

  return (
    <Provider store={store}>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <ErrorBoundary>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  minHeight: '100vh',
                  bgcolor: 'background.default'
                }}
              >
                {/* Navigation */}
                <Navbar onThemeToggle={toggleTheme} currentTheme={themeMode} />
                
                {/* Main Content */}
                <Box component="main" sx={{ flexGrow: 1, pt: { xs: 7, sm: 8 } }}>
                  <AnimatePresence mode="wait">
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/:id" element={<ProductDetail />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        
                        {/* Protected Routes */}
                        <Route 
                          path="/cart" 
                          element={
                            <ProtectedRoute>
                              <Cart />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/checkout" 
                          element={
                            <ProtectedRoute>
                              <Checkout />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/profile" 
                          element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/orders" 
                          element={
                            <ProtectedRoute>
                              <Orders />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/wishlist" 
                          element={
                            <ProtectedRoute>
                              <Wishlist />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/recommendations" 
                          element={
                            <ProtectedRoute>
                              <Recommendations />
                            </ProtectedRoute>
                          } 
                        />
                        
                        {/* Admin Routes */}
                        <Route 
                          path="/admin" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminDashboard />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/products" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminProducts />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/orders" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminOrders />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/users" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminUsers />
                            </ProtectedRoute>
                          } 
                        />
                        <Route 
                          path="/admin/analytics" 
                          element={
                            <ProtectedRoute requireAdmin>
                              <AdminAnalytics />
                            </ProtectedRoute>
                          } 
                        />
                        
                        {/* 404 Route */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AnimatePresence>
                </Box>
                
                {/* Footer */}
                <Footer />
                
                {/* Global Components */}
                <ChatBot />
                <NotificationSystem />
                <ARTryOnModal />
                
                {/* Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: '12px',
                      fontSize: '14px',
                      maxWidth: '400px'
                    },
                    success: {
                      iconTheme: {
                        primary: theme.palette.success.main,
                        secondary: theme.palette.success.contrastText
                      }
                    },
                    error: {
                      iconTheme: {
                        primary: theme.palette.error.main,
                        secondary: theme.palette.error.contrastText
                      }
                    }
                  }}
                />
              </Box>
            </ErrorBoundary>
          </Router>
        </ThemeProvider>
      </HelmetProvider>
    </Provider>
  );
}

export default App;