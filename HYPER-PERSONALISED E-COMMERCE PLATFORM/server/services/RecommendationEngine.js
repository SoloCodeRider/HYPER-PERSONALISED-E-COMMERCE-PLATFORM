const tf = require('@tensorflow/tfjs-node');
const { Matrix } = require('ml-matrix');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

class RecommendationEngine {
  constructor() {
    this.userItemMatrix = null;
    this.productEmbeddings = new Map();
    this.userEmbeddings = new Map();
    this.isInitialized = false;
    this.modelVersion = '1.0.0';
    
    // Initialize the recommendation engine
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🤖 Initializing AI Recommendation Engine...');
      await this.loadUserItemMatrix();
      await this.computeProductEmbeddings();
      await this.computeUserEmbeddings();
      this.isInitialized = true;
      console.log('✅ Recommendation Engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Recommendation Engine:', error);
    }
  }

  // Load and create user-item interaction matrix
  async loadUserItemMatrix() {
    try {
      const users = await User.find({ isActive: true }).select('_id behaviorData');
      const products = await Product.find({ status: 'active' }).select('_id');
      
      const userIds = users.map(u => u._id.toString());
      const productIds = products.map(p => p._id.toString());
      
      // Create interaction matrix
      const matrix = new Array(userIds.length).fill(0)
        .map(() => new Array(productIds.length).fill(0));
      
      // Fill matrix with interaction scores
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const browsingHistory = user.behaviorData?.browsingHistory || [];
        
        for (const interaction of browsingHistory) {
          const productIndex = productIds.indexOf(interaction.productId.toString());
          if (productIndex !== -1) {
            // Calculate interaction score based on duration and recency
            const recencyScore = this.calculateRecencyScore(interaction.timestamp);
            const durationScore = Math.min(interaction.duration / 60, 10) / 10; // normalize to 0-1
            matrix[i][productIndex] = Math.max(matrix[i][productIndex], recencyScore * 0.7 + durationScore * 0.3);
          }
        }
      }
      
      this.userItemMatrix = {
        matrix: new Matrix(matrix),
        userIds,
        productIds
      };
      
      console.log(`📊 User-Item Matrix loaded: ${userIds.length} users × ${productIds.length} products`);
    } catch (error) {
      console.error('Error loading user-item matrix:', error);
    }
  }

  // Compute product embeddings using content-based features
  async computeProductEmbeddings() {
    try {
      const products = await Product.find({ status: 'active' })
        .populate('category')
        .select('name description attributes category brand price analytics');
      
      for (const product of products) {
        const embedding = await this.createProductEmbedding(product);
        this.productEmbeddings.set(product._id.toString(), embedding);
      }
      
      console.log(`🔢 Product embeddings computed for ${products.length} products`);
    } catch (error) {
      console.error('Error computing product embeddings:', error);
    }
  }

  // Create product embedding from features
  async createProductEmbedding(product) {
    const features = [];
    
    // Price tier (0-1)
    const priceNormalized = Math.min(product.price / 1000, 1);
    features.push(priceNormalized);
    
    // Brand popularity (based on analytics)
    const brandPopularity = (product.analytics?.views || 0) / 10000;
    features.push(Math.min(brandPopularity, 1));
    
    // Rating
    features.push((product.analytics?.averageRating || 0) / 5);
    
    // Category encoding (simplified)
    const categoryFeatures = this.encodeCategoryFeatures(product.category);
    features.push(...categoryFeatures);
    
    // Attributes encoding
    const attributeFeatures = this.encodeAttributeFeatures(product.attributes);
    features.push(...attributeFeatures);
    
    // Seasonal relevance
    const seasonalFeatures = this.encodeSeasonalFeatures(product.attributes?.season || []);
    features.push(...seasonalFeatures);
    
    // Text features (simplified TF-IDF)
    const textFeatures = await this.extractTextFeatures(product.name + ' ' + product.description);
    features.push(...textFeatures);
    
    return tf.tensor1d(features);
  }

  // Compute user embeddings based on preferences and behavior
  async computeUserEmbeddings() {
    try {
      const users = await User.find({ isActive: true })
        .populate('preferences.categories')
        .select('preferences behaviorData personalizationScores');
      
      for (const user of users) {
        const embedding = await this.createUserEmbedding(user);
        this.userEmbeddings.set(user._id.toString(), embedding);
      }
      
      console.log(`👤 User embeddings computed for ${users.length} users`);
    } catch (error) {
      console.error('Error computing user embeddings:', error);
    }
  }

  // Create user embedding from preferences and behavior
  async createUserEmbedding(user) {
    const features = [];
    
    // Price preference
    const priceRange = user.preferences?.priceRange || { min: 0, max: 1000 };
    features.push(priceRange.min / 1000, priceRange.max / 1000);
    
    // Personalization scores
    const scores = user.personalizationScores || {};
    features.push(
      scores.fashionStyle || 0,
      scores.priceConsciousness || 0,
      scores.brandLoyalty || 0,
      scores.trendFollower || 0,
      scores.qualityFocused || 0,
      scores.impulseBuyer || 0
    );
    
    // Behavioral features
    const behavior = user.behaviorData || {};
    features.push(
      Math.min((behavior.totalPurchases || 0) / 50, 1),
      Math.min((behavior.totalSpent || 0) / 10000, 1),
      Math.min((behavior.averageOrderValue || 0) / 500, 1)
    );
    
    // Category preferences
    const categoryPrefs = this.encodeCategoryPreferences(user.preferences?.categories || []);
    features.push(...categoryPrefs);
    
    // Time-based patterns
    const timeFeatures = this.encodeTimePatterns(behavior.clickPatterns || {});
    features.push(...timeFeatures);
    
    return tf.tensor1d(features);
  }

  // Get personalized recommendations for a user
  async getRecommendations(userId, limit = 10, excludeViewed = true) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const user = await User.findById(userId)
        .populate('preferences.categories')
        .select('behaviorData preferences personalizationScores recentlyViewed');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get hybrid recommendations
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, limit * 2);
      const contentBasedRecs = await this.getContentBasedRecommendations(userId, limit * 2);
      const trendingRecs = await this.getTrendingRecommendations(limit);
      
      // Combine and rank recommendations
      const combinedRecs = this.combineRecommendations([
        { recommendations: collaborativeRecs, weight: 0.4 },
        { recommendations: contentBasedRecs, weight: 0.4 },
        { recommendations: trendingRecs, weight: 0.2 }
      ]);
      
      // Filter out recently viewed products if requested
      let filteredRecs = combinedRecs;
      if (excludeViewed) {
        const viewedIds = user.recentlyViewed.map(item => item.product.toString());
        filteredRecs = combinedRecs.filter(rec => !viewedIds.includes(rec.productId));
      }
      
      // Apply personalization boost
      const personalizedRecs = await this.applyPersonalizationBoost(filteredRecs, user);
      
      // Return top recommendations
      return personalizedRecs.slice(0, limit);
      
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, limit) {
    if (!this.userItemMatrix) return [];
    
    const userIndex = this.userItemMatrix.userIds.indexOf(userId);
    if (userIndex === -1) return [];
    
    // Find similar users using cosine similarity
    const userVector = this.userItemMatrix.matrix.getRow(userIndex);
    const similarities = [];
    
    for (let i = 0; i < this.userItemMatrix.matrix.rows; i++) {
      if (i !== userIndex) {
        const otherVector = this.userItemMatrix.matrix.getRow(i);
        const similarity = this.cosineSimilarity(userVector, otherVector);
        if (similarity > 0.1) {
          similarities.push({ userIndex: i, similarity });
        }
      }
    }
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Get recommendations from similar users
    const recommendations = new Map();
    const topSimilarUsers = similarities.slice(0, 10);
    
    for (const { userIndex: similarUserIndex, similarity } of topSimilarUsers) {
      const similarUserVector = this.userItemMatrix.matrix.getRow(similarUserIndex);
      
      for (let productIndex = 0; productIndex < similarUserVector.length; productIndex++) {
        if (userVector[productIndex] === 0 && similarUserVector[productIndex] > 0) {
          const productId = this.userItemMatrix.productIds[productIndex];
          const score = similarUserVector[productIndex] * similarity;
          
          if (recommendations.has(productId)) {
            recommendations.set(productId, recommendations.get(productId) + score);
          } else {
            recommendations.set(productId, score);
          }
        }
      }
    }
    
    // Convert to array and sort
    return Array.from(recommendations.entries())
      .map(([productId, score]) => ({ productId, score, type: 'collaborative' }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userId, limit) {
    const user = await User.findById(userId).select('behaviorData preferences');
    if (!user) return [];
    
    const userEmbedding = this.userEmbeddings.get(userId);
    if (!userEmbedding) return [];
    
    const recommendations = [];
    
    // Calculate similarity with all products
    for (const [productId, productEmbedding] of this.productEmbeddings) {
      const similarity = this.calculateEmbeddingSimilarity(userEmbedding, productEmbedding);
      recommendations.push({ productId, score: similarity, type: 'content-based' });
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Get trending recommendations
  async getTrendingRecommendations(limit) {
    try {
      const products = await Product.find({ status: 'active' })
        .sort({ 'analytics.trendingScore': -1, 'analytics.views': -1 })
        .limit(limit)
        .select('_id');
      
      return products.map(product => ({
        productId: product._id.toString(),
        score: 0.8, // Base trending score
        type: 'trending'
      }));
    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  // Combine multiple recommendation sources
  combineRecommendations(sources) {
    const combined = new Map();
    
    for (const { recommendations, weight } of sources) {
      for (const rec of recommendations) {
        const weightedScore = rec.score * weight;
        
        if (combined.has(rec.productId)) {
          const existing = combined.get(rec.productId);
          existing.score += weightedScore;
          existing.sources.push(rec.type);
        } else {
          combined.set(rec.productId, {
            productId: rec.productId,
            score: weightedScore,
            sources: [rec.type]
          });
        }
      }
    }
    
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  // Apply personalization boost based on user preferences
  async applyPersonalizationBoost(recommendations, user) {
    const products = await Product.find({
      _id: { $in: recommendations.map(r => r.productId) }
    }).populate('category');
    
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    
    return recommendations.map(rec => {
      const product = productMap.get(rec.productId);
      if (!product) return rec;
      
      let boost = 1;
      
      // Category preference boost
      const preferredCategories = user.preferences?.categories || [];
      if (preferredCategories.some(cat => cat.toString() === product.category._id.toString())) {
        boost *= 1.3;
      }
      
      // Price range boost
      const priceRange = user.preferences?.priceRange || { min: 0, max: 10000 };
      if (product.price >= priceRange.min && product.price <= priceRange.max) {
        boost *= 1.2;
      }
      
      // Brand preference boost
      const preferredBrands = user.preferences?.brands || [];
      if (preferredBrands.includes(product.brand)) {
        boost *= 1.4;
      }
      
      // Seasonal boost
      const currentSeason = this.getCurrentSeason();
      if (product.attributes?.season?.includes(currentSeason)) {
        boost *= 1.1;
      }
      
      return {
        ...rec,
        score: rec.score * boost,
        boost
      };
    }).sort((a, b) => b.score - a.score);
  }

  // Track user interactions for learning
  async trackUserInteraction(userId, productId, interactionType, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return;
      
      // Add to browsing history
      if (interactionType === 'view') {
        await user.addToBrowsingHistory(productId, metadata.duration, metadata.source);
      }
      
      // Update product analytics
      const product = await Product.findById(productId);
      if (product) {
        switch (interactionType) {
          case 'view':
            await product.incrementViews();
            break;
          case 'purchase':
            await product.incrementPurchases();
            break;
          case 'add_to_cart':
            product.analytics.addToCart += 1;
            await product.save();
            break;
          case 'add_to_wishlist':
            product.analytics.addToWishlist += 1;
            await product.save();
            break;
        }
      }
      
      // Trigger model retraining if needed
      await this.checkRetrainingNeeded();
      
    } catch (error) {
      console.error('Error tracking user interaction:', error);
    }
  }

  // Utility functions
  calculateRecencyScore(timestamp) {
    const now = new Date();
    const daysDiff = (now - new Date(timestamp)) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysDiff / 30); // Exponential decay over 30 days
  }

  cosineSimilarity(vectorA, vectorB) {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  calculateEmbeddingSimilarity(embeddingA, embeddingB) {
    const dotProduct = tf.sum(tf.mul(embeddingA, embeddingB));
    const normA = tf.norm(embeddingA);
    const normB = tf.norm(embeddingB);
    
    const similarity = tf.div(dotProduct, tf.mul(normA, normB));
    return similarity.dataSync()[0];
  }

  encodeCategoryFeatures(category) {
    // Simplified category encoding - in production, use proper one-hot encoding
    return [Math.random(), Math.random(), Math.random()]; // Placeholder
  }

  encodeAttributeFeatures(attributes) {
    // Encode product attributes as features
    const features = [];
    features.push((attributes?.colors?.length || 0) / 10);
    features.push((attributes?.sizes?.length || 0) / 10);
    features.push((attributes?.materials?.length || 0) / 5);
    return features;
  }

  encodeSeasonalFeatures(seasons) {
    const seasonMap = { spring: 0, summer: 1, fall: 2, winter: 3 };
    const features = [0, 0, 0, 0];
    seasons.forEach(season => {
      if (seasonMap[season] !== undefined) {
        features[seasonMap[season]] = 1;
      }
    });
    return features;
  }

  async extractTextFeatures(text) {
    // Simplified text feature extraction - in production, use proper NLP
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const meaningfulWords = words.filter(word => !commonWords.includes(word) && word.length > 2);
    
    return [
      meaningfulWords.length / 100, // Word count feature
      (text.match(/\b(premium|luxury|high-quality)\b/gi) || []).length / 10, // Quality indicators
      (text.match(/\b(sale|discount|cheap|affordable)\b/gi) || []).length / 10 // Price indicators
    ];
  }

  encodeCategoryPreferences(categories) {
    // Simplified category preference encoding
    return [categories.length / 10, Math.random(), Math.random()];
  }

  encodeTimePatterns(clickPatterns) {
    // Encode time-based clicking patterns
    const timeOfDay = clickPatterns.timeOfDay || [];
    const dayOfWeek = clickPatterns.dayOfWeek || [];
    
    return [
      timeOfDay.length > 0 ? timeOfDay.reduce((sum, t) => sum + t.clicks, 0) / 100 : 0,
      dayOfWeek.length > 0 ? dayOfWeek.reduce((sum, d) => sum + d.clicks, 0) / 100 : 0
    ];
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  async getFallbackRecommendations(limit) {
    try {
      const products = await Product.find({ status: 'active', featured: true })
        .sort({ 'analytics.views': -1 })
        .limit(limit)
        .select('_id');
      
      return products.map(product => ({
        productId: product._id.toString(),
        score: 0.5,
        type: 'fallback'
      }));
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  async checkRetrainingNeeded() {
    // Check if model needs retraining based on new interactions
    // This would trigger periodic model updates in production
  }
}

module.exports = RecommendationEngine;