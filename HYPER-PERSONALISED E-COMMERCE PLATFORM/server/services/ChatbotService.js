const natural = require('natural');
const Sentiment = require('sentiment');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

class ChatbotService {
  constructor() {
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.classifier = new natural.BayesClassifier();
    this.conversationHistory = new Map();
    
    // Initialize the chatbot
    this.initialize();
  }

  async initialize() {
    console.log('🤖 Initializing AI Chatbot Service...');
    await this.trainIntentClassifier();
    this.setupResponseTemplates();
    console.log('✅ Chatbot Service initialized successfully');
  }

  // Train intent classification model
  async trainIntentClassifier() {
    // Training data for intent classification
    const trainingData = [
      // Greeting intents
      { text: 'hello hi hey good morning afternoon evening', intent: 'greeting' },
      { text: 'how are you doing today', intent: 'greeting' },
      { text: 'whats up sup howdy', intent: 'greeting' },
      
      // Product inquiry intents
      { text: 'show me products items clothing shoes accessories', intent: 'product_inquiry' },
      { text: 'looking for searching need want to buy', intent: 'product_inquiry' },
      { text: 'do you have any available stock', intent: 'product_inquiry' },
      { text: 'what is the price cost how much does it cost', intent: 'price_inquiry' },
      { text: 'size chart sizing guide measurements', intent: 'size_inquiry' },
      { text: 'colors available color options', intent: 'color_inquiry' },
      
      // Order related intents
      { text: 'track my order shipment delivery status where is my order', intent: 'order_tracking' },
      { text: 'cancel my order return refund', intent: 'order_modification' },
      { text: 'order history past orders previous purchases', intent: 'order_history' },
      { text: 'when will my order arrive delivery time shipping', intent: 'delivery_inquiry' },
      
      // Account related intents
      { text: 'my account profile settings preferences', intent: 'account_inquiry' },
      { text: 'forgot password reset password login issues', intent: 'account_support' },
      { text: 'update my information change address phone email', intent: 'account_update' },
      { text: 'loyalty points rewards program membership', intent: 'loyalty_inquiry' },
      
      // Support intents
      { text: 'help me need assistance support customer service', intent: 'support_request' },
      { text: 'complaint problem issue not working broken', intent: 'complaint' },
      { text: 'shipping policy return policy exchange policy', intent: 'policy_inquiry' },
      { text: 'payment methods accepted cards paypal', intent: 'payment_inquiry' },
      
      // Recommendation intents
      { text: 'recommend suggest what should I buy popular trending', intent: 'recommendation_request' },
      { text: 'similar products like this alternatives', intent: 'similar_products' },
      { text: 'best sellers top rated most popular', intent: 'popular_products' },
      
      // Goodbye intents
      { text: 'bye goodbye see you later thanks thank you', intent: 'goodbye' },
      { text: 'thats all nothing else no more questions', intent: 'goodbye' }
    ];

    // Train the classifier
    trainingData.forEach(({ text, intent }) => {
      const words = text.split(' ');
      words.forEach(word => {
        this.classifier.addDocument(word, intent);
      });
    });

    this.classifier.train();
    console.log('🧠 Intent classifier trained with', trainingData.length, 'patterns');
  }

  // Setup response templates
  setupResponseTemplates() {
    this.responseTemplates = {
      greeting: [
        "Hello! 👋 I'm your personal shopping assistant. How can I help you today?",
        "Hi there! 😊 Welcome to our store. What are you looking for?",
        "Good day! I'm here to help you find exactly what you need. What can I assist you with?"
      ],
      
      product_inquiry: [
        "I'd be happy to help you find products! Could you tell me what type of item you're looking for?",
        "Great! What kind of products are you interested in? I can show you our latest collections.",
        "Let me help you discover some amazing products. What category interests you most?"
      ],
      
      price_inquiry: [
        "I can help you with pricing information. Which product would you like to know about?",
        "Sure! Please share the product name or show me what you're interested in, and I'll get you the price details."
      ],
      
      order_tracking: [
        "I can help you track your order. Let me look that up for you right away.",
        "No problem! I'll check the status of your recent orders for you."
      ],
      
      recommendation_request: [
        "I'd love to give you personalized recommendations! Let me analyze your preferences.",
        "Based on your shopping history and preferences, I have some great suggestions for you!"
      ],
      
      support_request: [
        "I'm here to help! What specific issue can I assist you with?",
        "Of course! Please tell me more about what you need help with, and I'll do my best to assist you."
      ],
      
      complaint: [
        "I'm sorry to hear you're experiencing an issue. Let me help resolve this for you right away.",
        "I apologize for any inconvenience. Please tell me more about the problem so I can assist you better."
      ],
      
      goodbye: [
        "Thank you for chatting with me! Have a wonderful day and happy shopping! 🛍️",
        "It was great helping you today! Feel free to reach out anytime you need assistance. Goodbye! 👋",
        "Thanks for visiting! I hope you found everything you were looking for. See you soon! 😊"
      ],
      
      default: [
        "I'm not sure I understand that completely. Could you rephrase your question?",
        "Let me connect you with a human agent who can better assist you with that.",
        "I'm still learning! Could you try asking that in a different way?"
      ]
    };
  }

  // Main message processing function
  async processMessage(message, userId, sessionId = null) {
    try {
      const session = sessionId || `${userId}_${Date.now()}`;
      
      // Get or create conversation history
      if (!this.conversationHistory.has(session)) {
        this.conversationHistory.set(session, {
          messages: [],
          context: {},
          userId,
          startTime: new Date()
        });
      }
      
      const conversation = this.conversationHistory.get(session);
      conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
      
      // Analyze message sentiment
      const sentimentResult = this.sentiment.analyze(message);
      
      // Classify intent
      const intent = this.classifyIntent(message);
      
      // Get user context
      const userContext = await this.getUserContext(userId);
      
      // Generate response based on intent
      const response = await this.generateResponse(intent, message, userContext, conversation);
      
      // Add response to conversation history
      conversation.messages.push({ role: 'assistant', content: response.text, timestamp: new Date() });
      
      // Clean up old conversations (keep last 100 messages)
      if (conversation.messages.length > 100) {
        conversation.messages = conversation.messages.slice(-100);
      }
      
      return {
        text: response.text,
        intent,
        sentiment: {
          score: sentimentResult.score,
          comparative: sentimentResult.comparative,
          tokens: sentimentResult.tokens
        },
        suggestions: response.suggestions || [],
        actions: response.actions || [],
        sessionId: session
      };
      
    } catch (error) {
      console.error('Error processing chatbot message:', error);
      return {
        text: "I'm sorry, I encountered an error. Please try again or contact our support team.",
        intent: 'error',
        sentiment: { score: 0, comparative: 0, tokens: [] },
        suggestions: ['Contact Support', 'Try Again'],
        actions: [],
        sessionId: sessionId || `${userId}_${Date.now()}`
      };
    }
  }

  // Classify user intent
  classifyIntent(message) {
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    // Use the trained classifier
    const classifications = this.classifier.getClassifications(stemmedTokens.join(' '));
    
    // Return the highest confidence intent
    if (classifications.length > 0 && classifications[0].value > 0.3) {
      return classifications[0].label;
    }
    
    return 'default';
  }

  // Get user context for personalization
  async getUserContext(userId) {
    try {
      const user = await User.findById(userId)
        .populate('preferences.categories')
        .select('firstName preferences behaviorData recentlyViewed loyaltyPoints membershipTier');
      
      if (!user) return {};
      
      const recentOrders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('items.product', 'name price');
      
      return {
        user,
        recentOrders,
        hasOrders: recentOrders.length > 0,
        isVip: user.membershipTier === 'gold' || user.membershipTier === 'platinum'
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  }

  // Generate contextual response
  async generateResponse(intent, message, userContext, conversation) {
    const { user, recentOrders, hasOrders, isVip } = userContext;
    const userName = user?.firstName || 'there';
    
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(userName, isVip);
        
      case 'product_inquiry':
        return await this.handleProductInquiry(message, user);
        
      case 'price_inquiry':
        return await this.handlePriceInquiry(message, user);
        
      case 'order_tracking':
        return await this.handleOrderTracking(user, recentOrders);
        
      case 'recommendation_request':
        return await this.handleRecommendationRequest(user);
        
      case 'size_inquiry':
        return this.handleSizeInquiry();
        
      case 'account_inquiry':
        return this.handleAccountInquiry(user);
        
      case 'loyalty_inquiry':
        return this.handleLoyaltyInquiry(user);
        
      case 'support_request':
        return this.handleSupportRequest(userName);
        
      case 'complaint':
        return this.handleComplaint(userName);
        
      case 'goodbye':
        return this.handleGoodbye(userName);
        
      default:
        return this.handleDefault(message, conversation);
    }
  }

  // Intent-specific handlers
  handleGreeting(userName, isVip) {
    const vipGreeting = isVip ? " As one of our valued VIP members, you'll get priority assistance today!" : "";
    const templates = this.responseTemplates.greeting;
    const baseResponse = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      text: `Hi ${userName}! ${baseResponse}${vipGreeting}`,
      suggestions: ['Show me new arrivals', 'I need recommendations', 'Track my order', 'Help with sizing']
    };
  }

  async handleProductInquiry(message, user) {
    // Extract product keywords from message
    const keywords = this.extractProductKeywords(message);
    
    if (keywords.length > 0) {
      // Search for products matching keywords
      const products = await Product.find({
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { tags: { $in: keywords } }
        ],
        status: 'active'
      }).limit(5).select('name price primaryImage');
      
      if (products.length > 0) {
        const productList = products.map(p => `• ${p.name} - $${p.price}`).join('\n');
        return {
          text: `I found some great products for you:\n\n${productList}\n\nWould you like to see more details about any of these?`,
          suggestions: products.map(p => p.name),
          actions: [{ type: 'show_products', products: products.map(p => p._id) }]
        };
      }
    }
    
    const templates = this.responseTemplates.product_inquiry;
    return {
      text: templates[Math.floor(Math.random() * templates.length)],
      suggestions: ['Clothing', 'Shoes', 'Accessories', 'Electronics', 'Home & Garden']
    };
  }

  async handlePriceInquiry(message, user) {
    const productKeywords = this.extractProductKeywords(message);
    
    if (productKeywords.length > 0) {
      const product = await Product.findOne({
        $or: [
          { name: { $regex: productKeywords.join('|'), $options: 'i' } },
          { tags: { $in: productKeywords } }
        ],
        status: 'active'
      }).select('name price originalPrice');
      
      if (product) {
        const personalizedPrice = user ? product.getPersonalizedPrice(user._id) : product.price;
        const discount = product.originalPrice && product.originalPrice > product.price ? 
          ` (${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off!)` : '';
        
        return {
          text: `The price for ${product.name} is $${personalizedPrice.toFixed(2)}${discount}. ${user && personalizedPrice < product.price ? 'This is your personalized price!' : ''}`,
          suggestions: ['Add to cart', 'View details', 'Find similar products']
        };
      }
    }
    
    return {
      text: "I'd be happy to help with pricing! Could you tell me which specific product you're interested in?",
      suggestions: ['Browse products', 'Search by category']
    };
  }

  async handleOrderTracking(user, recentOrders) {
    if (!user) {
      return {
        text: "I'd be happy to help track your order! Please log in to your account first.",
        suggestions: ['Login', 'Create account']
      };
    }
    
    if (recentOrders.length === 0) {
      return {
        text: "I don't see any recent orders in your account. Would you like to start shopping?",
        suggestions: ['Browse products', 'View recommendations']
      };
    }
    
    const latestOrder = recentOrders[0];
    const orderSummary = `Your most recent order (#${latestOrder._id.toString().slice(-6)}) is currently ${latestOrder.status}. `;
    const estimatedDelivery = latestOrder.estimatedDelivery ? 
      `Estimated delivery: ${latestOrder.estimatedDelivery.toDateString()}` : 
      'We\'ll update you with tracking information soon.';
    
    return {
      text: orderSummary + estimatedDelivery,
      suggestions: ['View order details', 'Contact support', 'Track package'],
      actions: [{ type: 'show_order', orderId: latestOrder._id }]
    };
  }

  async handleRecommendationRequest(user) {
    if (!user) {
      return {
        text: "I'd love to give you personalized recommendations! Please log in so I can tailor suggestions to your preferences.",
        suggestions: ['Login', 'View trending products']
      };
    }
    
    // This would integrate with the RecommendationEngine
    const recommendations = await this.getQuickRecommendations(user._id);
    
    if (recommendations.length > 0) {
      return {
        text: `Based on your preferences, I think you'd love these items! I've selected them just for you based on your shopping history and style.`,
        suggestions: ['View recommendations', 'Refine preferences', 'Browse categories'],
        actions: [{ type: 'show_recommendations', products: recommendations }]
      };
    }
    
    return {
      text: "I'm analyzing your preferences to create personalized recommendations. In the meantime, check out our trending products!",
      suggestions: ['View trending', 'Browse categories', 'Update preferences']
    };
  }

  handleSizeInquiry() {
    return {
      text: "I can help you find the perfect size! Our size guide includes detailed measurements for all our products. Would you like me to show you the size chart for a specific item?",
      suggestions: ['View size guide', 'Size calculator', 'Contact support']
    };
  }

  handleAccountInquiry(user) {
    if (!user) {
      return {
        text: "I can help you with account-related questions! Please log in to access your account information.",
        suggestions: ['Login', 'Create account', 'Forgot password']
      };
    }
    
    return {
      text: `Hi ${user.firstName}! Your account is active and you're a ${user.membershipTier} member. What would you like to know about your account?`,
      suggestions: ['View profile', 'Order history', 'Loyalty points', 'Update preferences']
    };
  }

  handleLoyaltyInquiry(user) {
    if (!user) {
      return {
        text: "Our loyalty program offers amazing rewards! Sign up to start earning points with every purchase.",
        suggestions: ['Learn more', 'Sign up', 'Login']
      };
    }
    
    return {
      text: `You have ${user.loyaltyPoints} loyalty points and you're a ${user.membershipTier} member! Points can be redeemed for discounts on future purchases.`,
      suggestions: ['Redeem points', 'Earn more points', 'Membership benefits']
    };
  }

  handleSupportRequest(userName) {
    return {
      text: `I'm here to help you, ${userName}! I can assist with orders, products, account issues, and more. What do you need help with?`,
      suggestions: ['Order issues', 'Product questions', 'Account help', 'Technical support']
    };
  }

  handleComplaint(userName) {
    return {
      text: `I'm sorry you're experiencing an issue, ${userName}. I want to make this right for you. Please tell me more about what happened so I can help resolve it quickly.`,
      suggestions: ['Describe the issue', 'Request refund', 'Speak to manager', 'File complaint']
    };
  }

  handleGoodbye(userName) {
    const templates = this.responseTemplates.goodbye;
    return {
      text: templates[Math.floor(Math.random() * templates.length)].replace('you', userName),
      suggestions: []
    };
  }

  handleDefault(message, conversation) {
    // Try to understand context from conversation history
    const recentMessages = conversation.messages.slice(-5);
    const context = this.analyzeConversationContext(recentMessages);
    
    if (context.topic) {
      return {
        text: `I think you're asking about ${context.topic}. Let me connect you with a specialist who can help you better with that.`,
        suggestions: ['Contact specialist', 'Try different question', 'Main menu']
      };
    }
    
    const templates = this.responseTemplates.default;
    return {
      text: templates[Math.floor(Math.random() * templates.length)],
      suggestions: ['Browse products', 'Track order', 'Get recommendations', 'Contact support']
    };
  }

  // Utility functions
  extractProductKeywords(message) {
    const productTerms = [
      'shirt', 'pants', 'dress', 'shoes', 'sneakers', 'boots', 'jacket', 'coat',
      'jeans', 'shorts', 'skirt', 'blouse', 'sweater', 'hoodie', 'hat', 'bag',
      'watch', 'jewelry', 'necklace', 'ring', 'earrings', 'sunglasses'
    ];
    
    const tokens = this.tokenizer.tokenize(message.toLowerCase());
    return tokens.filter(token => productTerms.includes(token));
  }

  async getQuickRecommendations(userId) {
    try {
      // This would integrate with RecommendationEngine
      // For now, return some sample recommendations
      const products = await Product.find({ featured: true, status: 'active' })
        .limit(3)
        .select('_id name price');
      
      return products.map(p => p._id);
    } catch (error) {
      console.error('Error getting quick recommendations:', error);
      return [];
    }
  }

  analyzeConversationContext(messages) {
    // Simple context analysis - in production, use more sophisticated NLP
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    
    if (allText.includes('order') || allText.includes('shipping')) {
      return { topic: 'orders' };
    }
    if (allText.includes('size') || allText.includes('fit')) {
      return { topic: 'sizing' };
    }
    if (allText.includes('price') || allText.includes('cost')) {
      return { topic: 'pricing' };
    }
    
    return { topic: null };
  }

  // Clean up old conversations
  cleanupConversations() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionId, conversation] of this.conversationHistory) {
      if (conversation.startTime < cutoffTime) {
        this.conversationHistory.delete(sessionId);
      }
    }
  }

  // Get conversation history for a session
  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || null;
  }

  // Analytics for chatbot performance
  getAnalytics() {
    const totalConversations = this.conversationHistory.size;
    const avgMessagesPerConversation = Array.from(this.conversationHistory.values())
      .reduce((sum, conv) => sum + conv.messages.length, 0) / totalConversations || 0;
    
    return {
      totalConversations,
      avgMessagesPerConversation,
      activeConversations: totalConversations
    };
  }
}

module.exports = ChatbotService;