import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import productSlice from './slices/productSlice';
import cartSlice from './slices/cartSlice';
import wishlistSlice from './slices/wishlistSlice';
import orderSlice from './slices/orderSlice';
import recommendationSlice from './slices/recommendationSlice';
import uiSlice from './slices/uiSlice';
import chatbotSlice from './slices/chatbotSlice';
import notificationSlice from './slices/notificationSlice';
import searchSlice from './slices/searchSlice';
import analyticsSlice from './slices/analyticsSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart', 'wishlist', 'ui'], // Only persist these slices
  blacklist: ['products', 'orders', 'recommendations', 'chatbot', 'notifications', 'search', 'analytics']
};

// Auth persist config (separate for sensitive data)
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated'] // Only persist essential auth data
};

// Cart persist config
const cartPersistConfig = {
  key: 'cart',
  storage,
  whitelist: ['items', 'total', 'itemCount'] // Persist cart data
};

// UI persist config
const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme', 'language', 'currency', 'preferences'] // Persist UI preferences
};

// Root reducer
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  products: productSlice,
  cart: persistReducer(cartPersistConfig, cartSlice),
  wishlist: wishlistSlice,
  orders: orderSlice,
  recommendations: recommendationSlice,
  ui: persistReducer(uiPersistConfig, uiSlice),
  chatbot: chatbotSlice,
  notifications: notificationSlice,
  search: searchSlice,
  analytics: analyticsSlice
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH'
        ],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates']
      },
      immutableCheck: {
        ignoredPaths: ['items.dates']
      }
    }).concat(
      // Add custom middleware here if needed
      // For example: API middleware, analytics middleware, etc.
    ),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: {}
});

// Create persistor
export const persistor = persistStore(store);

// Export types for TypeScript (if using TypeScript)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store as default
export default store;

// Utility functions for store management
export const getStoreState = () => store.getState();

export const subscribeToStore = (callback) => store.subscribe(callback);

// Action creators for common operations
export const resetStore = () => {
  return {
    type: 'RESET_STORE'
  };
};

// Store enhancer for development
if (process.env.NODE_ENV === 'development') {
  // Enable Redux DevTools Extension
  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    console.log('Redux DevTools Extension detected');
  }
  
  // Log store state changes in development
  store.subscribe(() => {
    const state = store.getState();
    console.log('Store updated:', {
      auth: {
        isAuthenticated: state.auth.isAuthenticated,
        user: state.auth.user?.firstName || 'Not logged in'
      },
      cart: {
        itemCount: state.cart.itemCount,
        total: state.cart.total
      },
      ui: {
        theme: state.ui.theme,
        loading: state.ui.loading
      }
    });
  });
}

// Error handling for store
store.subscribe(() => {
  const state = store.getState();
  
  // Check for errors in any slice
  Object.keys(state).forEach(sliceKey => {
    const slice = state[sliceKey];
    if (slice && slice.error) {
      console.error(`Error in ${sliceKey} slice:`, slice.error);
      
      // You could dispatch a global error action here
      // or send error to analytics service
    }
  });
});

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  let actionCount = 0;
  let lastActionTime = Date.now();
  
  store.subscribe(() => {
    actionCount++;
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    
    if (timeSinceLastAction > 100) {
      console.warn(`Slow Redux action detected: ${timeSinceLastAction}ms since last action`);
    }
    
    lastActionTime = now;
    
    // Log performance metrics every 100 actions
    if (actionCount % 100 === 0) {
      console.log(`Redux Performance: ${actionCount} actions dispatched`);
    }
  });
}

// Cleanup function for when app unmounts
export const cleanupStore = () => {
  // Clear any intervals, timeouts, or subscriptions
  // This would be called in app cleanup
  console.log('Cleaning up Redux store...');
};

// Helper function to get specific slice state
export const getSliceState = (sliceName) => {
  const state = store.getState();
  return state[sliceName];
};

// Helper function to check if user is authenticated
export const isUserAuthenticated = () => {
  const state = store.getState();
  return state.auth.isAuthenticated && state.auth.token;
};

// Helper function to get current user
export const getCurrentUser = () => {
  const state = store.getState();
  return state.auth.user;
};

// Helper function to get cart summary
export const getCartSummary = () => {
  const state = store.getState();
  return {
    itemCount: state.cart.itemCount,
    total: state.cart.total,
    items: state.cart.items
  };
};

// Helper function to get UI preferences
export const getUIPreferences = () => {
  const state = store.getState();
  return {
    theme: state.ui.theme,
    language: state.ui.language,
    currency: state.ui.currency
  };
};

// Middleware for analytics tracking
const analyticsMiddleware = (store) => (next) => (action) => {
  // Track important user actions for analytics
  const analyticsActions = [
    'auth/login',
    'auth/register',
    'cart/addItem',
    'cart/removeItem',
    'orders/createOrder',
    'products/viewProduct',
    'wishlist/addItem'
  ];
  
  if (analyticsActions.includes(action.type)) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', action.type.replace('/', '_'), {
        event_category: 'user_interaction',
        event_label: action.type
      });
    }
  }
  
  return next(action);
};

// Add analytics middleware in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_ENABLE_ANALYTICS) {
  // This would be added to the middleware array above
  console.log('Analytics middleware enabled');
}