const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Product Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  
  // Dynamic Pricing for Personalization
  dynamicPricing: {
    enabled: { type: Boolean, default: false },
    basePrice: Number,
    personalizedDiscounts: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      discountPercentage: { type: Number, min: 0, max: 100 },
      reason: String, // 'loyalty', 'birthday', 'first-time', 'cart-abandonment'
      validUntil: Date
    }],
    demandMultiplier: { type: Number, default: 1, min: 0.5, max: 3 },
    seasonalAdjustment: { type: Number, default: 1, min: 0.5, max: 2 }
  },
  
  // Inventory
  inventory: {
    quantity: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    trackInventory: { type: Boolean, default: true },
    allowBackorder: { type: Boolean, default: false },
    variants: [{
      size: String,
      color: String,
      material: String,
      quantity: { type: Number, min: 0 },
      sku: String,
      price: Number,
      images: [String]
    }]
  },
  
  // Categories and Classification
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [String],
  brand: {
    type: String,
    required: [true, 'Brand is required']
  },
  
  // Product Attributes for AI
  attributes: {
    colors: [String],
    sizes: [String],
    materials: [String],
    style: String,
    season: [String], // spring, summer, fall, winter
    occasion: [String], // casual, formal, party, work, sport
    ageGroup: [String], // kids, teens, adults, seniors
    gender: [String], // male, female, unisex
    features: [String], // waterproof, breathable, eco-friendly, etc.
    care: [String], // washing instructions
    origin: String, // country of origin
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    }
  },
  
  // Media
  images: [{
    url: { type: String, required: true },
    alt: String,
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 }
  }],
  videos: [{
    url: String,
    thumbnail: String,
    title: String,
    duration: Number
  }],
  
  // AR/3D Model Support
  arModel: {
    modelUrl: String, // 3D model file URL
    textureUrl: String,
    scale: { type: Number, default: 1 },
    supported: { type: Boolean, default: false },
    tryOnEnabled: { type: Boolean, default: false },
    bodyParts: [String] // face, hands, feet, full-body
  },
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      lowercase: true
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  featured: { type: Boolean, default: false },
  isDigital: { type: Boolean, default: false },
  
  // Analytics and AI Data
  analytics: {
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    addToCart: { type: Number, default: 0 },
    addToWishlist: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    returnRate: { type: Number, default: 0 },
    viewDuration: { type: Number, default: 0 }, // average time spent viewing
    bounceRate: { type: Number, default: 0 },
    searchRanking: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    seasonalityScore: {
      spring: { type: Number, default: 0 },
      summer: { type: Number, default: 0 },
      fall: { type: Number, default: 0 },
      winter: { type: Number, default: 0 }
    }
  },
  
  // AI Recommendation Data
  aiData: {
    similarProducts: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      similarity: { type: Number, min: 0, max: 1 }
    }],
    complementaryProducts: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      compatibility: { type: Number, min: 0, max: 1 }
    }],
    userSegments: [{
      segment: String,
      affinity: { type: Number, min: 0, max: 1 }
    }],
    keywords: [{
      keyword: String,
      relevance: { type: Number, min: 0, max: 1 }
    }],
    embeddings: {
      text: [Number], // text embedding vector
      image: [Number], // image embedding vector
      combined: [Number] // combined embedding
    }
  },
  
  // Shipping
  shipping: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    freeShipping: { type: Boolean, default: false },
    shippingClass: String,
    handlingTime: { type: Number, default: 1 }, // days
    restrictions: [String] // countries or regions where shipping is restricted
  },
  
  // Vendor/Supplier
  vendor: {
    name: String,
    id: String,
    contact: String
  },
  
  // Timestamps
  publishedAt: Date,
  lastModified: { type: Date, default: Date.now },
  
  // Custom Fields for Extensibility
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'analytics.views': -1 });
productSchema.index({ 'analytics.purchases': -1 });
productSchema.index({ 'analytics.averageRating': -1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ sku: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'attributes.colors': 1 });
productSchema.index({ 'attributes.sizes': 1 });
productSchema.index({ 'attributes.season': 1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.inventory.quantity === 0) return 'out-of-stock';
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.seo.slug) {
    this.seo.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to update analytics
productSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

productSchema.methods.incrementPurchases = function() {
  this.analytics.purchases += 1;
  this.analytics.conversionRate = this.analytics.views > 0 ? 
    (this.analytics.purchases / this.analytics.views) * 100 : 0;
  return this.save();
};

productSchema.methods.updateRating = function(newRating, isNewReview = true) {
  if (isNewReview) {
    const totalRating = this.analytics.averageRating * this.analytics.totalReviews + newRating;
    this.analytics.totalReviews += 1;
    this.analytics.averageRating = totalRating / this.analytics.totalReviews;
  }
  return this.save();
};

// Method to check if product is available
productSchema.methods.isAvailable = function(quantity = 1) {
  return this.status === 'active' && 
         (this.inventory.quantity >= quantity || this.inventory.allowBackorder);
};

// Method to get personalized price for user
productSchema.methods.getPersonalizedPrice = function(userId) {
  if (!this.dynamicPricing.enabled) return this.price;
  
  const personalizedDiscount = this.dynamicPricing.personalizedDiscounts
    .find(discount => discount.userId.toString() === userId.toString() && 
                     discount.validUntil > new Date());
  
  if (personalizedDiscount) {
    return this.price * (1 - personalizedDiscount.discountPercentage / 100);
  }
  
  // Apply demand and seasonal multipliers
  return this.price * this.dynamicPricing.demandMultiplier * this.dynamicPricing.seasonalAdjustment;
};

module.exports = mongoose.model('Product', productSchema);