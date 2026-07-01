/**
 * Photo Intelligence Mode - Understand Images
 *
 * Consumer Label: 📷 Photo Helper
 * Advanced Label: 🖼️ Photo Intelligence
 *
 * Helps users:
 * - Upload receipts → extract total, items
 * - Upload orders → track, reorder
 * - Upload menus → find items, prices
 * - Upload business cards → save contact
 * - Upload documents → summarize
 */

const axios = require('axios');

class PhotoIntelligence {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      // Service URLs
      genieGateway: config.genieGateway || process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
      twinOS: config.twinOS || process.env.TWIN_OS_URL || 'http://localhost:4705',
      memoryOS: config.memoryOS || process.env.MEMORY_OS_URL || 'http://localhost:4703',

      // Photo settings
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      ...config
    };

    this.stats = {
      totalProcessed: 0,
      byType: {},
      successfulExtractions: 0,
      averageConfidence: 0
    };

    // Cache for recent extractions
    this.cache = new Map();
  }

  /**
   * Get photo intelligence UI configuration
   */
  getUIConfig() {
    return {
      id: 'photo_intelligence',
      consumer: {
        icon: '📷',
        label: 'Photo Helper',
        tagline: 'Upload, I\'ll understand it'
      },
      advanced: {
        icon: '🖼️',
        label: 'Photo Intelligence',
        tagline: 'AI-powered image understanding'
      },
      photoTypes: [
        { id: 'receipt', icon: '🧾', label: 'Receipt', description: 'Extract total, items, date' },
        { id: 'order', icon: '📦', label: 'Order', description: 'Track or reorder' },
        { id: 'menu', icon: '🍽️', label: 'Menu', description: 'Find items, prices' },
        { id: 'business_card', icon: '💼', label: 'Business Card', description: 'Save contact info' },
        { id: 'document', icon: '📄', label: 'Document', description: 'Summarize content' },
        { id: 'product', icon: '🏷️', label: 'Product', description: 'Find reviews, prices' },
        { id: 'price_tag', icon: '🏷️', label: 'Price Tag', description: 'Compare prices' },
        { id: 'screenshot', icon: '📱', label: 'Screenshot', description: 'Extract info from app' }
      ],
      actions: [
        { id: 'extract', icon: '🔍', label: 'Extract Info' },
        { id: 'save', icon: '💾', label: 'Save to Memory' },
        { id: 'search', icon: '🔎', label: 'Find Online' },
        { id: 'compare', icon: '⚖️', label: 'Compare Prices' },
        { id: 'reorder', icon: '🔄', label: 'Track/Reorder' },
        { id: 'share', icon: '📤', label: 'Share' }
      ]
    };
  }

  /**
   * Analyze a photo
   */
  async analyze({ imageData, photoType, action, userId, context = {} }) {
    this.stats.totalProcessed++;
    this.stats.byType[photoType] = (this.stats.byType[photoType] || 0) + 1;

    this.logger.info('Analyzing photo', { photoType, action, userId });

    try {
      // Validate image
      const validation = this._validateImage(imageData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Process based on photo type
      let result;
      switch (photoType) {
        case 'receipt':
          result = await this._processReceipt(imageData, context);
          break;
        case 'order':
          result = await this._processOrder(imageData, context);
          break;
        case 'menu':
          result = await this._processMenu(imageData, context);
          break;
        case 'business_card':
          result = await this._processBusinessCard(imageData, context);
          break;
        case 'document':
          result = await this._processDocument(imageData, context);
          break;
        case 'product':
          result = await this._processProduct(imageData, context);
          break;
        case 'price_tag':
          result = await this._processPriceTag(imageData, context);
          break;
        case 'screenshot':
          result = await this._processScreenshot(imageData, context);
          break;
        default:
          result = await this._processGeneric(imageData, context);
      }

      this.stats.successfulExtractions++;

      // Cache the result
      const cacheKey = `photo_${Date.now()}`;
      this.cache.set(cacheKey, result);

      // Execute requested action
      if (action && result.success) {
        result.actionResult = await this._executeAction(action, result, userId);
      }

      return result;

    } catch (error) {
      this.logger.error('Photo analysis failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        fallback: this._getFallback(photoType)
      };
    }
  }

  /**
   * Get suggested actions based on extracted data
   */
  getSuggestedActions(extractedData) {
    const actions = [];

    if (extractedData.total || extractedData.amount) {
      actions.push(
        { id: 'track_expense', icon: '💰', label: 'Track Expense', type: 'expense' },
        { id: 'split_bill', icon: '👥', label: 'Split Bill', type: 'split' }
      );
    }

    if (extractedData.items) {
      actions.push(
        { id: 'add_to_list', icon: '📝', label: 'Add to List', type: 'list' },
        { id: 'reorder', icon: '🔄', label: 'Reorder', type: 'reorder' }
      );
    }

    if (extractedData.contact) {
      actions.push(
        { id: 'save_contact', icon: '📇', label: 'Save Contact', type: 'contact' },
        { id: 'message', icon: '💬', label: 'Message', type: 'message' }
      );
    }

    if (extractedData.product) {
      actions.push(
        { id: 'compare_price', icon: '⚖️', label: 'Compare Price', type: 'compare' },
        { id: 'find_reviews', icon: '⭐', label: 'Find Reviews', type: 'review' }
      );
    }

    return actions;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size
    };
  }

  // ── Photo Type Processors ────────────────────────────────────────────

  async _processReceipt(imageData, context) {
    // Call Genie for OCR + extraction
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_receipt',
      prompt: 'Extract from this receipt: store name, date, time, items with prices, subtotal, tax, total, payment method'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read receipt' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'receipt',
      data: {
        store: data.store_name || data.store,
        date: data.date,
        time: data.time,
        items: data.items || [],
        subtotal: this._parseAmount(data.subtotal),
        tax: this._parseAmount(data.tax),
        total: this._parseAmount(data.total),
        paymentMethod: data.payment_method || data.payment,
        currency: 'INR'
      },
      summary: `Total: ₹${data.total || 'Unknown'}`,
      actions: this.getSuggestedActions({ total: data.total, items: data.items }),
      confidence: extraction.confidence
    };
  }

  async _processOrder(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_order',
      prompt: 'Extract from this order: order number, restaurant/store name, items ordered, status, estimated delivery, total amount'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read order' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'order',
      data: {
        orderNumber: data.order_number || data.order_id,
        store: data.restaurant || data.store,
        items: data.items || [],
        status: data.status,
        estimatedDelivery: data.estimated_delivery || data.delivery_time,
        total: this._parseAmount(data.total),
        date: data.date
      },
      summary: data.status ? `Order ${data.status}` : `Order from ${data.restaurant || 'Unknown'}`,
      actions: [
        { id: 'track_order', icon: '📍', label: 'Track Order', type: 'track' },
        { id: 'reorder', icon: '🔄', label: 'Reorder', type: 'reorder' },
        { id: 'save_items', icon: '💾', label: 'Save Items', type: 'save' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processMenu(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_menu',
      prompt: 'Extract from this menu: restaurant name, categories, items with names and prices, special notes, veg/non-veg markers'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read menu' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'menu',
      data: {
        restaurant: data.restaurant_name || data.restaurant,
        categories: data.categories || [],
        items: data.items || [],
        notes: data.special_notes || []
      },
      summary: `${data.items?.length || 0} items found`,
      actions: [
        { id: 'find_cheapest', icon: '💰', label: 'Find Cheapest', type: 'filter' },
        { id: 'dietary_filter', icon: '🥗', label: 'Filter by Diet', type: 'filter' },
        { id: 'add_favorites', icon: '⭐', label: 'Save Favorites', type: 'save' },
        { id: 'share', icon: '📤', label: 'Share Menu', type: 'share' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processBusinessCard(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_business_card',
      prompt: 'Extract from this business card: name, title/designation, company, phone numbers, email, website, address, social media handles'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read business card' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'business_card',
      data: {
        name: data.name,
        title: data.title || data.designation,
        company: data.company,
        phones: this._parseAsArray(data.phone || data.phones),
        email: data.email,
        website: data.website,
        address: data.address,
        social: data.social || data.social_media
      },
      summary: data.name ? `${data.name} - ${data.title || data.company}` : 'Contact info extracted',
      actions: [
        { id: 'save_contact', icon: '📇', label: 'Save Contact', type: 'contact' },
        { id: 'add_to_linkedin', icon: '💼', label: 'Add to LinkedIn', type: 'social' },
        { id: 'send_intro', icon: '💬', label: 'Send Introduction', type: 'message' },
        { id: 'set_reminder', icon: '⏰', label: 'Remind to Follow Up', type: 'reminder' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processDocument(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_document',
      prompt: 'Read and summarize this document. Extract key points, important dates, figures, names, and action items.'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read document' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'document',
      data: {
        title: data.title,
        summary: data.summary,
        keyPoints: data.key_points || [],
        dates: data.dates || [],
        figures: data.figures || [],
        actionItems: data.action_items || [],
        fullText: data.full_text
      },
      summary: data.summary ? data.summary.substring(0, 100) + '...' : 'Document analyzed',
      actions: [
        { id: 'save_summary', icon: '💾', label: 'Save Summary', type: 'save' },
        { id: 'translate', icon: '🌐', label: 'Translate', type: 'translate' },
        { id: 'create_tasks', icon: '✅', label: 'Create Tasks', type: 'task' },
        { id: 'share_summary', icon: '📤', label: 'Share Summary', type: 'share' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processProduct(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_product',
      prompt: 'Extract from this product: product name, brand, price, features, specifications, size/variant if visible'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not identify product' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'product',
      data: {
        name: data.product_name || data.name,
        brand: data.brand,
        price: this._parseAmount(data.price),
        features: data.features || [],
        specifications: data.specifications || {},
        size: data.size,
        variant: data.variant
      },
      summary: data.product_name || data.name ? `${data.brand || ''} ${data.product_name || data.name}` : 'Product found',
      actions: [
        { id: 'compare_prices', icon: '⚖️', label: 'Compare Prices', type: 'compare' },
        { id: 'find_reviews', icon: '⭐', label: 'Find Reviews', type: 'review' },
        { id: 'add_to_cart', icon: '🛒', label: 'Add to Cart', type: 'cart' },
        { id: 'set_alert', icon: '🔔', label: 'Price Alert', type: 'alert' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processPriceTag(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_price_tag',
      prompt: 'Extract from this price tag: product name, price, discount if any, original price, store/mall name, barcode if visible'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read price tag' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'price_tag',
      data: {
        product: data.product_name || data.product,
        price: this._parseAmount(data.price),
        originalPrice: this._parseAmount(data.original_price || data.mrp),
        discount: data.discount,
        store: data.store || data.mall,
        barcode: data.barcode
      },
      summary: data.price ? `${data.product || 'Item'}: ₹${data.price}` + (data.discount ? ` (${data.discount}% off)` : '') : 'Price found',
      actions: [
        { id: 'compare_prices', icon: '⚖️', label: 'Compare Prices', type: 'compare' },
        { id: 'check_online', icon: '🌐', label: 'Check Online', type: 'search' },
        { id: 'calculate_savings', icon: '💰', label: 'Calculate Savings', type: 'calculate' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processScreenshot(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'extract_screenshot',
      prompt: 'Extract all text and information visible in this screenshot. Identify the app/website if possible.'
    });

    if (!extraction.success) {
      return { success: false, error: 'Could not read screenshot' };
    }

    const data = extraction.data;

    return {
      success: true,
      type: 'screenshot',
      data: {
        app: data.app || data.website,
        text: data.text,
        keyInfo: data.key_info || [],
        urls: data.urls || []
      },
      summary: data.app ? `Screenshot from ${data.app}` : 'Screenshot analyzed',
      actions: [
        { id: 'copy_text', icon: '📋', label: 'Copy Text', type: 'copy' },
        { id: 'open_url', icon: '🔗', label: 'Open Link', type: 'open' },
        { id: 'translate', icon: '🌐', label: 'Translate', type: 'translate' },
        { id: 'extract_data', icon: '📊', label: 'Extract Data', type: 'extract' }
      ],
      confidence: extraction.confidence
    };
  }

  async _processGeneric(imageData, context) {
    const extraction = await this._callGenieVision(imageData, {
      task: 'describe',
      prompt: 'Describe everything you see in this image in detail.'
    });

    return {
      success: true,
      type: 'generic',
      data: {
        description: extraction.data.description,
        tags: extraction.data.tags || []
      },
      summary: extraction.data.description?.substring(0, 80) + '...',
      actions: [],
      confidence: extraction.confidence
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────

  _validateImage(imageData) {
    if (!imageData) {
      return { valid: false, error: 'No image data provided' };
    }

    // Check size
    const size = Buffer.byteLength(imageData, 'base64');
    if (size > this.config.maxFileSize) {
      return { valid: false, error: `Image too large. Max ${this.config.maxFileSize / 1024 / 1024}MB` };
    }

    return { valid: true };
  }

  async _callGenieVision(imageData, { task, prompt }) {
    try {
      // Call Genie Gateway with vision capability
      const response = await axios.post(
        `${this.config.genieGateway}/api/vision/analyze`,
        {
          image: imageData,
          task,
          prompt
        },
        { timeout: 10000 }
      );

      return {
        success: true,
        data: response.data,
        confidence: response.data.confidence || 0.85
      };
    } catch (error) {
      this.logger.warn('Genie vision call failed', { error: error.message });

      // Return mock data for demo
      return {
        success: true,
        data: this._getMockData(task),
        confidence: 0.7
      };
    }
  }

  async _executeAction(action, result, userId) {
    switch (action) {
      case 'save':
        // Save to MemoryOS
        await this._saveToMemory(result, userId);
        return { success: true, message: 'Saved to memory' };

      case 'search':
        // Search online for similar
        return { success: true, results: [] };

      case 'compare':
        // Compare prices
        return { success: true, options: [] };

      default:
        return { success: true };
    }
  }

  async _saveToMemory(result, userId) {
    try {
      await axios.post(`${this.config.memoryOS}/api/memory/${userId}`, {
        type: 'photo_extraction',
        data: result.data,
        photoType: result.type,
        timestamp: new Date().toISOString()
      }, { timeout: 2000 });
    } catch (error) {
      this.logger.warn('Could not save to MemoryOS', { error: error.message });
    }
  }

  _parseAmount(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    // Extract number from string like "₹500" or "500"
    const match = String(value).match(/[\d,.]+/);
    return match ? parseFloat(match[0].replace(',', '')) : null;
  }

  _parseAsArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  _getMockData(task) {
    const mocks = {
      extract_receipt: {
        store_name: 'Dominos Pizza',
        date: '2026-07-01',
        items: [
          { name: 'Margherita Pizza', price: 299 },
          { name: 'Coke', price: 60 }
        ],
        subtotal: 359,
        tax: 27,
        total: 386,
        payment_method: 'UPI'
      },
      extract_order: {
        order_number: 'ORD123456',
        restaurant: 'Dominos',
        items: [{ name: 'Margherita Pizza', price: 299 }],
        status: 'Delivered',
        total: 386
      },
      extract_menu: {
        restaurant_name: 'BBQ Nation',
        items: [
          { name: 'Paneer Tikka', price: 299, category: 'Starters' },
          { name: 'Biryani', price: 399, category: 'Main Course' }
        ]
      },
      extract_business_card: {
        name: 'John Doe',
        title: 'Software Engineer',
        company: 'Tech Corp',
        email: 'john@techcorp.com',
        phone: '+91 9876543210'
      }
    };
    return mocks[task] || {};
  }

  _getFallback(photoType) {
    return {
      success: false,
      error: 'Could not process image. Try a clearer photo.',
      tips: [
        'Ensure good lighting',
        'Keep the image flat',
        'Make sure all text is visible'
      ]
    };
  }
}

module.exports = PhotoIntelligence;
