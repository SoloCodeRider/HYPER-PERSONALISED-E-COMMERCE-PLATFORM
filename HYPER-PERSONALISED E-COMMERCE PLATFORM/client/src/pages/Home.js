import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Avatar,
  IconButton,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ShoppingBag,
  Favorite,
  Star,
  TrendingUp,
  PersonalVideo,
  AutoAwesome,
  ViewInAr,
  SmartToy,
  LocalOffer,
  FlashOn
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import { Helmet } from 'react-helmet-async';
import { LazyLoadImage } from 'react-lazy-load-image-component';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/effect-fade';

// Redux actions
import { selectUser, selectIsAuthenticated } from '../store/slices/authSlice';
import { fetchRecommendations } from '../store/slices/recommendationSlice';
import { fetchFeaturedProducts, fetchTrendingProducts } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { addToWishlist } from '../store/slices/wishlistSlice';

// Components
import ProductCard from '../components/Products/ProductCard';
import PersonalizedBanner from '../components/Home/PersonalizedBanner';
import CategoryGrid from '../components/Home/CategoryGrid';
import TestimonialCarousel from '../components/Home/TestimonialCarousel';
import NewsletterSignup from '../components/Home/NewsletterSignup';
import AIRecommendationWidget from '../components/AI/AIRecommendationWidget';
import ARShowcase from '../components/AR/ARShowcase';
import DynamicPricingBanner from '../components/Home/DynamicPricingBanner';

// Hooks
import { useInView } from 'react-intersection-observer';
import { useSocket } from '../hooks/useSocket';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const socket = useSocket();
  
  // Redux state
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { recommendations, loading: recLoading } = useSelector(state => state.recommendations);
  const { featuredProducts, trendingProducts, loading: productLoading } = useSelector(state => state.products);
  
  // Local state
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [personalizedDeals, setPersonalizedDeals] = useState([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  
  // Intersection observer refs
  const [heroRef, heroInView] = useInView({ threshold: 0.3 });
  const [featuresRef, featuresInView] = useInView({ threshold: 0.2 });
  const [productsRef, productsInView] = useInView({ threshold: 0.1 });
  const [testimonialsRef, testimonialsInView] = useInView({ threshold: 0.2 });
  
  // Hero slides data
  const heroSlides = [
    {
      id: 1,
      title: isAuthenticated ? `Welcome back, ${user?.firstName}!` : 'Discover Your Perfect Style',
      subtitle: isAuthenticated 
        ? 'Your personalized shopping experience awaits' 
        : 'AI-powered recommendations just for you',
      image: '/images/hero-1.jpg',
      cta: isAuthenticated ? 'View My Recommendations' : 'Get Started',
      ctaAction: () => isAuthenticated ? navigate('/recommendations') : navigate('/register'),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 2,
      title: 'Try Before You Buy',
      subtitle: 'Experience products in AR before making a purchase',
      image: '/images/hero-ar.jpg',
      cta: 'Explore AR Features',
      ctaAction: () => navigate('/products?ar=true'),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 3,
      title: 'Smart Shopping Assistant',
      subtitle: 'Get instant help from our AI-powered chatbot',
      image: '/images/hero-ai.jpg',
      cta: 'Chat Now',
      ctaAction: () => window.dispatchEvent(new CustomEvent('openChatbot')),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];
  
  // Features data
  const features = [
    {
      icon: <AutoAwesome />,
      title: 'AI Recommendations',
      description: 'Personalized product suggestions based on your preferences and behavior',
      color: '#667eea'
    },
    {
      icon: <ViewInAr />,
      title: 'AR Try-On',
      description: 'Visualize products in your space or on yourself before buying',
      color: '#f093fb'
    },
    {
      icon: <SmartToy />,
      title: 'Smart Assistant',
      description: '24/7 AI-powered customer support and shopping guidance',
      color: '#4facfe'
    },
    {
      icon: <LocalOffer />,
      title: 'Dynamic Pricing',
      description: 'Personalized discounts and offers tailored to your loyalty',
      color: '#43e97b'
    },
    {
      icon: <FlashOn />,
      title: 'Real-time Updates',
      description: 'Instant notifications about restocks, price drops, and new arrivals',
      color: '#fa709a'
    },
    {
      icon: <PersonalVideo />,
      title: 'Personal Styling',
      description: 'AI-curated outfits and style recommendations for every occasion',
      color: '#ffecd2'
    }
  ];
  
  // Load data on component mount
  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchTrendingProducts());
    
    if (isAuthenticated) {
      dispatch(fetchRecommendations());
      loadPersonalizedDeals();
    }
  }, [dispatch, isAuthenticated]);
  
  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket && isAuthenticated) {
      socket.on('recommendations-updated', (data) => {
        setRealtimeUpdates(prev => [...prev, {
          type: 'recommendation',
          message: 'New recommendations available!',
          timestamp: Date.now()
        }]);
      });
      
      socket.on('price-drop-alert', (data) => {
        setRealtimeUpdates(prev => [...prev, {
          type: 'price-drop',
          message: `Price dropped on ${data.productName}!`,
          timestamp: Date.now()
        }]);
      });
      
      return () => {
        socket.off('recommendations-updated');
        socket.off('price-drop-alert');
      };
    }
  }, [socket, isAuthenticated]);
  
  // Load personalized deals
  const loadPersonalizedDeals = async () => {
    try {
      // This would fetch personalized deals from API
      // For now, using mock data
      setPersonalizedDeals([
        {
          id: 1,
          title: '20% off your favorite brands',
          description: 'Based on your shopping history',
          discount: 20,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        {
          id: 2,
          title: 'Free shipping on next order',
          description: 'Loyalty reward for being a valued customer',
          discount: 'Free Shipping',
          validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      ]);
    } catch (error) {
      console.error('Error loading personalized deals:', error);
    }
  };
  
  // Handle product interactions
  const handleAddToCart = (product) => {
    dispatch(addToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.primaryImage,
      quantity: 1
    }));
    
    // Track interaction for AI
    if (socket && isAuthenticated) {
      socket.emit('product-interaction', {
        userId: user._id,
        productId: product._id,
        action: 'add_to_cart'
      });
    }
  };
  
  const handleAddToWishlist = (product) => {
    dispatch(addToWishlist(product));
    
    if (socket && isAuthenticated) {
      socket.emit('product-interaction', {
        userId: user._id,
        productId: product._id,
        action: 'add_to_wishlist'
      });
    }
  };
  
  const handleProductView = (product) => {
    navigate(`/products/${product._id}`);
    
    if (socket && isAuthenticated) {
      socket.emit('product-view', {
        userId: user._id,
        productId: product._id,
        source: 'home_page'
      });
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Hyper-Personalized E-Commerce - AI-Powered Shopping Experience</title>
        <meta name="description" content="Discover a revolutionary shopping experience with AI-powered recommendations, AR try-ons, and personalized deals tailored just for you." />
        <meta name="keywords" content="AI shopping, personalized ecommerce, AR try-on, smart recommendations, online shopping" />
        <link rel="canonical" href={window.location.origin} />
      </Helmet>
      
      {/* Hero Section */}
      <Box ref={heroRef} sx={{ position: 'relative', overflow: 'hidden' }}>
        <Swiper
          modules={[Autoplay, Pagination, Navigation, EffectFade]}
          effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation={!isMobile}
          onSlideChange={(swiper) => setHeroSlideIndex(swiper.activeIndex)}
          style={{ height: isMobile ? '60vh' : '80vh' }}
        >
          {heroSlides.map((slide, index) => (
            <SwiperSlide key={slide.id}>
              <Box
                sx={{
                  height: '100%',
                  background: slide.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.3)',
                    zIndex: 1
                  }
                }}
              >
                <LazyLoadImage
                  src={slide.image}
                  alt={slide.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                  }}
                />
                
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                  <AnimatePresence>
                    {heroInView && (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      >
                        <Box sx={{ maxWidth: 600, color: 'white' }}>
                          <Typography
                            variant={isMobile ? 'h3' : 'h1'}
                            sx={{
                              fontWeight: 700,
                              mb: 2,
                              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                            }}
                          >
                            {slide.title}
                          </Typography>
                          
                          <Typography
                            variant={isMobile ? 'h6' : 'h5'}
                            sx={{
                              mb: 4,
                              opacity: 0.9,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}
                          >
                            {slide.subtitle}
                          </Typography>
                          
                          <Button
                            variant="contained"
                            size="large"
                            onClick={slide.ctaAction}
                            sx={{
                              px: 4,
                              py: 1.5,
                              fontSize: '1.1rem',
                              borderRadius: 3,
                              background: 'rgba(255,255,255,0.2)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              '&:hover': {
                                background: 'rgba(255,255,255,0.3)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            {slide.cta}
                          </Button>
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Container>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
      
      {/* Personalized Banner */}
      {isAuthenticated && (
        <PersonalizedBanner 
          user={user} 
          deals={personalizedDeals}
          realtimeUpdates={realtimeUpdates}
        />
      )}
      
      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box ref={featuresRef} sx={{ textAlign: 'center', mb: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Typography variant="h2" sx={{ mb: 2, fontWeight: 600 }}>
              Why Choose Our Platform?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Experience the future of online shopping with AI-powered personalization
            </Typography>
          </motion.div>
        </Box>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[8]
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: feature.color,
                      '& .MuiSvgIcon-root': { fontSize: 32 }
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      {/* AI Recommendations Section */}
      {isAuthenticated && (
        <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
          <Container maxWidth="lg">
            <AIRecommendationWidget
              recommendations={recommendations}
              loading={recLoading}
              onProductView={handleProductView}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
            />
          </Container>
        </Box>
      )}
      
      {/* Featured Products Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box ref={productsRef} sx={{ mb: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={productsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h3" sx={{ fontWeight: 600 }}>
                Featured Products
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate('/products')}
                endIcon={<TrendingUp />}
              >
                View All
              </Button>
            </Box>
          </motion.div>
        </Box>
        
        <Grid container spacing={3}>
          {productLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton variant="text" height={24} />
                    <Skeleton variant="text" height={20} width="60%" />
                    <Skeleton variant="text" height={32} width="40%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            featuredProducts?.slice(0, 8).map((product, index) => (
              <Grid item xs={12} sm={6} md={3} key={product._id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={productsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onView={() => handleProductView(product)}
                    onAddToCart={() => handleAddToCart(product)}
                    onAddToWishlist={() => handleAddToWishlist(product)}
                    showARButton={product.arModel?.supported}
                  />
                </motion.div>
              </Grid>
            ))
          )}
        </Grid>
      </Container>
      
      {/* Category Grid */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <CategoryGrid />
        </Container>
      </Box>
      
      {/* AR Showcase */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <ARShowcase />
      </Container>
      
      {/* Dynamic Pricing Banner */}
      {isAuthenticated && (
        <DynamicPricingBanner user={user} />
      )}
      
      {/* Testimonials */}
      <Box ref={testimonialsRef} sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <TestimonialCarousel />
          </motion.div>
        </Container>
      </Box>
      
      {/* Newsletter Signup */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <NewsletterSignup />
      </Container>
    </>
  );
};

export default Home;