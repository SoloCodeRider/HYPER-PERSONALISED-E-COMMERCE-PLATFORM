import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Rating,
  Badge,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  ShoppingCart,
  ViewInAr,
  Share,
  Visibility,
  LocalOffer,
  FlashOn,
  Star
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useSelector } from 'react-redux';
import { selectWishlistItems } from '../../store/slices/wishlistSlice';

const ProductCard = ({
  product,
  onView,
  onAddToCart,
  onAddToWishlist,
  onShare,
  onARView,
  showARButton = false,
  compact = false,
  showQuickActions = true
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const wishlistItems = useSelector(selectWishlistItems);
  
  const isInWishlist = wishlistItems.some(item => item._id === product._id);
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  const isNew = product.isNew || (new Date() - new Date(product.createdAt)) < 7 * 24 * 60 * 60 * 1000;
  const isTrending = product.analytics?.views > 1000;
  
  const handleCardClick = (e) => {
    // Don't trigger card click if clicking on buttons
    if (e.target.closest('button') || e.target.closest('.MuiIconButton-root')) {
      return;
    }
    onView?.(product);
  };
  
  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };
  
  const handleAddToWishlist = (e) => {
    e.stopPropagation();
    onAddToWishlist?.(product);
  };
  
  const handleShare = (e) => {
    e.stopPropagation();
    onShare?.(product);
  };
  
  const handleARView = (e) => {
    e.stopPropagation();
    onARView?.(product);
  };
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        sx={{
          height: compact ? 300 : 400,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: theme.shadows[8],
            '& .product-image': {
              transform: 'scale(1.05)'
            },
            '& .quick-actions': {
              opacity: 1,
              transform: 'translateY(0)'
            }
          }
        }}
        onClick={handleCardClick}
      >
        {/* Image Container */}
        <Box sx={{ position: 'relative', height: compact ? 180 : 240, overflow: 'hidden' }}>
          <LazyLoadImage
            src={product.primaryImage || product.images?.[0] || '/images/placeholder-product.jpg'}
            alt={product.name}
            className="product-image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              opacity: imageLoaded ? 1 : 0
            }}
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* Loading placeholder */}
          {!imageLoaded && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                bgcolor: 'grey.200',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          )}
          
          {/* Badges */}
          <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {isNew && (
              <Chip
                label="NEW"
                size="small"
                sx={{
                  bgcolor: theme.palette.success.main,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            )}
            
            {isTrending && (
              <Chip
                icon={<TrendingUp sx={{ fontSize: 14 }} />}
                label="TRENDING"
                size="small"
                sx={{
                  bgcolor: theme.palette.warning.main,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            )}
            
            {hasDiscount && (
              <Chip
                icon={<LocalOffer sx={{ fontSize: 14 }} />}
                label={`-${discountPercentage}%`}
                size="small"
                sx={{
                  bgcolor: theme.palette.error.main,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>
          
          {/* Stock Status */}
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            {isOutOfStock && (
              <Chip
                label="OUT OF STOCK"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.error.main, 0.9),
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            )}
            
            {isLowStock && !isOutOfStock && (
              <Chip
                icon={<FlashOn sx={{ fontSize: 14 }} />}
                label={`Only ${product.stock} left`}
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.warning.main, 0.9),
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>
          
          {/* Quick Actions */}
          {showQuickActions && (
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="quick-actions"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <Tooltip title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'} placement="left">
                    <IconButton
                      size="small"
                      onClick={handleAddToWishlist}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          bgcolor: theme.palette.background.paper,
                          color: theme.palette.error.main
                        }
                      }}
                    >
                      {isInWishlist ? <Favorite color="error" /> : <FavoriteBorder />}
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Quick View" placement="left">
                    <IconButton
                      size="small"
                      onClick={handleCardClick}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          bgcolor: theme.palette.background.paper,
                          color: theme.palette.primary.main
                        }
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  
                  {showARButton && (
                    <Tooltip title="View in AR" placement="left">
                      <IconButton
                        size="small"
                        onClick={handleARView}
                        sx={{
                          bgcolor: alpha(theme.palette.background.paper, 0.9),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            bgcolor: theme.palette.background.paper,
                            color: theme.palette.secondary.main
                          }
                        }}
                      >
                        <ViewInAr />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="Share" placement="left">
                    <IconButton
                      size="small"
                      onClick={handleShare}
                      sx={{
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                          bgcolor: theme.palette.background.paper,
                          color: theme.palette.info.main
                        }
                      }}
                    >
                      <Share />
                    </IconButton>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </Box>
        
        {/* Content */}
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: compact ? 1.5 : 2 }}>
          {/* Brand */}
          {product.brand && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}
            >
              {product.brand}
            </Typography>
          )}
          
          {/* Product Name */}
          <Typography
            variant={compact ? "body2" : "h6"}
            sx={{
              fontWeight: 600,
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3
            }}
          >
            {product.name}
          </Typography>
          
          {/* Rating */}
          {product.rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Rating
                value={product.rating.average || 0}
                precision={0.1}
                size="small"
                readOnly
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                ({product.rating.count || 0})
              </Typography>
            </Box>
          )}
          
          {/* Price */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography
              variant={compact ? "h6" : "h5"}
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main
              }}
            >
              {formatPrice(product.price)}
            </Typography>
            
            {hasDiscount && (
              <Typography
                variant="body2"
                sx={{
                  textDecoration: 'line-through',
                  color: 'text.secondary'
                }}
              >
                {formatPrice(product.originalPrice)}
              </Typography>
            )}
          </Box>
          
          {/* Add to Cart Button */}
          <Box sx={{ mt: 'auto' }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              sx={{
                borderRadius: 2,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
                ...(isOutOfStock && {
                  bgcolor: 'grey.300',
                  color: 'grey.600'
                })
              }}
            >
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;