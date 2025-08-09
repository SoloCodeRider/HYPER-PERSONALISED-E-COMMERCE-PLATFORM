const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'moderator'],
    default: 'customer'
  },
  
  // Addresses
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    isDefault: { type: Boolean, default: false }
  }],
  
  // Personalization Data
  preferences: {
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    brands: [String],
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000 }
    },
    colors: [String],
    sizes: [String],
    styles: [String],
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      promotions: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },
  
  // Behavioral Data for AI
  behaviorData: {
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastPurchaseDate: Date,
    favoriteCategories: [{
      category: String,
      score: { type: Number, default: 0 }
    }],
    browsingHistory: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      timestamp: { type: Date, default: Date.now },
      duration: Number, // seconds spent viewing
      source: String // search, recommendation, category, etc.
    }],
    searchHistory: [{
      query: String,
      timestamp: { type: Date, default: Date.now },
      resultsClicked: Number
    }],
    clickPatterns: {
      timeOfDay: [{ hour: Number, clicks: Number }],
      dayOfWeek: [{ day: Number, clicks: Number }],
      deviceType: [{ type: String, usage: Number }]
    },
    seasonalPreferences: {
      spring: [String],
      summer: [String],
      fall: [String],
      winter: [String]
    }
  },
  
  // AI Personalization Scores
  personalizationScores: {
    fashionStyle: { type: Number, default: 0 },
    priceConsciousness: { type: Number, default: 0 },
    brandLoyalty: { type: Number, default: 0 },
    trendFollower: { type: Number, default: 0 },
    qualityFocused: { type: Number, default: 0 },
    impulseBuyer: { type: Number, default: 0 },
    seasonalShopper: { type: Number, default: 0 },
    loyaltyScore: { type: Number, default: 0 }
  },
  
  // Wishlist and Favorites
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  recentlyViewed: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    viewedAt: { type: Date, default: Date.now }
  }],
  
  // Social Features
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Loyalty Program
  loyaltyPoints: { type: Number, default: 0 },
  membershipTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  // Security
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Device and Session Info
  devices: [{
    deviceId: String,
    deviceType: String,
    browser: String,
    os: String,
    lastUsed: { type: Date, default: Date.now },
    pushToken: String // for push notifications
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'behaviorData.browsingHistory.productId': 1 });
userSchema.index({ 'behaviorData.browsingHistory.timestamp': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ loyaltyPoints: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { loginAttempts: 1, lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }
  
  return this.updateOne(updates);
};

// Method to update personalization scores
userSchema.methods.updatePersonalizationScores = function(interactions) {
  // AI logic to update personalization scores based on user interactions
  // This would be called by the recommendation engine
};

// Method to add to browsing history
userSchema.methods.addToBrowsingHistory = function(productId, duration = 0, source = 'direct') {
  this.behaviorData.browsingHistory.unshift({
    productId,
    duration,
    source,
    timestamp: new Date()
  });
  
  // Keep only last 100 items
  if (this.behaviorData.browsingHistory.length > 100) {
    this.behaviorData.browsingHistory = this.behaviorData.browsingHistory.slice(0, 100);
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);