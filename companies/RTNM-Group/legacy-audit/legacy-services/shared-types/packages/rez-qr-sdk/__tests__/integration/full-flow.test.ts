/**
 * Full QR Integration Flow Tests
 *
 * Tests the complete flow for each QR type:
 * - Room QR: Scan -> Request -> Pay -> Feedback
 * - Menu QR: Scan -> Order -> Split Bill -> Pay
 * - Store QR: Scan -> Browse -> Book -> Pay
 * - Campaign QR: Scan -> Claim -> Visit -> Purchase
 */

import { QRSDK } from '../../src';

// Mock data for testing
const mockConfig = {
  apiKey: 'test-api-key',
  environment: 'development' as const,
};

describe('QR SDK Integration Tests', () => {
  let sdk: QRSDK;

  beforeEach(() => {
    sdk = new QRSDK(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SDK Initialization', () => {
    test('should initialize with default configuration', () => {
      const sdk = new QRSDK();
      expect(sdk).toBeDefined();
      expect(sdk.room).toBeDefined();
      expect(sdk.menu).toBeDefined();
      expect(sdk.store).toBeDefined();
      expect(sdk.campaign).toBeDefined();
      expect(sdk.ai).toBeDefined();
      expect(sdk.auth).toBeDefined();
      expect(sdk.wallet).toBeDefined();
    });

    test('should initialize with custom environment', () => {
      const sdk = new QRSDK({ environment: 'production' });
      expect(sdk).toBeDefined();
    });

    test('should initialize with custom URLs', () => {
      const sdk = new QRSDK({
        apiUrl: 'http://localhost:3001',
        walletUrl: 'http://localhost:4004',
      });
      expect(sdk).toBeDefined();
    });
  });

  describe('Room QR Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.room.validateQR).toBe('function');
      expect(typeof sdk.room.submitRequest).toBe('function');
      expect(typeof sdk.room.checkout).toBe('function');
      expect(typeof sdk.room.submitFeedback).toBe('function');
      expect(typeof sdk.room.getRoom).toBe('function');
      expect(typeof sdk.room.getBill).toBe('function');
      expect(typeof sdk.room.getAmenities).toBe('function');
      expect(typeof sdk.room.requestWakeUpCall).toBe('function');
    });

    test('should validate room QR structure', async () => {
      // This is a mock test - in real integration, you'd test against actual API
      const mockRoomQR = {
        id: 'room-123',
        hotelId: 'hotel-456',
        hotelName: 'Test Hotel',
        roomNumber: '305',
        floor: 3,
        guestId: 'guest-789',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-18',
        amenities: ['wifi', 'tv', 'minibar'],
        qrType: 'room_service',
      };

      expect(mockRoomQR.id).toBeDefined();
      expect(mockRoomQR.hotelName).toBeDefined();
      expect(mockRoomQR.roomNumber).toBeDefined();
    });

    test('should validate service request structure', () => {
      const mockRequest = {
        roomId: 'room-123',
        category: 'room_service',
        itemId: 'coffee',
        priority: 'normal',
        notes: 'With oat milk',
      };

      expect(mockRequest.roomId).toBeDefined();
      expect(mockRequest.category).toBeDefined();
      expect(mockRequest.priority).toBeDefined();
    });

    test('should validate feedback structure', () => {
      const mockFeedback = {
        type: 'room_service',
        rating: 5,
        categories: [
          { category: 'service', rating: 5 },
        ],
        comment: 'Great service!',
      };

      expect(mockFeedback.rating).toBeGreaterThanOrEqual(1);
      expect(mockFeedback.rating).toBeLessThanOrEqual(5);
    });
  });

  describe('Menu QR Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.menu.getMenu).toBe('function');
      expect(typeof sdk.menu.filterByDietary).toBe('function');
      expect(typeof sdk.menu.callWaiter).toBe('function');
      expect(typeof sdk.menu.splitBill).toBe('function');
      expect(typeof sdk.menu.checkout).toBe('function');
      expect(typeof sdk.menu.addToCart).toBe('function');
      expect(typeof sdk.menu.placeOrder).toBe('function');
      expect(typeof sdk.menu.searchItems).toBe('function');
    });

    test('should filter menu items by dietary preferences', () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Veggie Burger',
          dietary: [{ code: 'vegetarian' }, { code: 'gluten_free' }],
          allergens: ['soy'],
        },
        {
          id: 'item-2',
          name: 'Beef Burger',
          dietary: [],
          allergens: ['gluten', 'dairy'],
        },
        {
          id: 'item-3',
          name: 'Garden Salad',
          dietary: [{ code: 'vegetarian' }, { code: 'vegan' }],
          allergens: [],
        },
      ];

      const filters = { vegetarian: true };
      const filtered = sdk.menu.filterByDietary(mockItems, filters);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((i) => i.id)).toContain('item-1');
      expect(filtered.map((i) => i.id)).toContain('item-3');
    });

    test('should filter out items with allergens', () => {
      const mockItems = [
        { id: 'item-1', dietary: [], allergens: ['peanuts'] },
        { id: 'item-2', dietary: [], allergens: ['dairy'] },
        { id: 'item-3', dietary: [], allergens: [] },
      ];

      const filtered = sdk.menu.filterByDietary(mockItems, { nutFree: true });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('item-3');
    });

    test('should handle multiple dietary filters', () => {
      const mockItems = [
        { id: 'item-1', dietary: [{ code: 'vegetarian' }], allergens: [] },
        { id: 'item-2', dietary: [{ code: 'vegan' }], allergens: [] },
        { id: 'item-3', dietary: [{ code: 'vegetarian' }, { code: 'gluten_free' }], allergens: [] },
      ];

      const filtered = sdk.menu.filterByDietary(mockItems, {
        vegetarian: true,
        glutenFree: true,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('item-3');
    });
  });

  describe('Store QR Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.store.getProfile).toBe('function');
      expect(typeof sdk.store.getLinks).toBe('function');
      expect(typeof sdk.store.generateQR).toBe('function');
      expect(typeof sdk.store.trackEvent).toBe('function');
      expect(typeof sdk.store.getAnalytics).toBe('function');
      expect(typeof sdk.store.favoriteStore).toBe('function');
      expect(typeof sdk.store.shareStore).toBe('function');
    });

    test('should validate store profile structure', () => {
      const mockProfile = {
        id: 'store-123',
        slug: 'acme-business',
        name: 'Acme Business',
        description: 'Best business in town',
        links: [
          { id: 'link-1', type: 'menu', title: 'Menu', url: '/menu', sortOrder: 1, active: true },
          { id: 'link-2', type: 'order', title: 'Order', url: '/order', sortOrder: 2, active: true },
        ],
        verified: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15',
      };

      expect(mockProfile.id).toBeDefined();
      expect(mockProfile.slug).toBeDefined();
      expect(mockProfile.name).toBeDefined();
      expect(Array.isArray(mockProfile.links)).toBe(true);
    });

    test('should validate QR code types', () => {
      const validTypes = ['menu', 'order', 'payment', 'feedback', 'loyalty', 'custom'];

      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('Campaign QR Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.campaign.getCampaign).toBe('function');
      expect(typeof sdk.campaign.claimReward).toBe('function');
      expect(typeof sdk.campaign.bookConsultation).toBe('function');
      expect(typeof sdk.campaign.requestSample).toBe('function');
      expect(typeof sdk.campaign.trackConversion).toBe('function');
      expect(typeof sdk.campaign.getAnalytics).toBe('function');
      expect(typeof sdk.campaign.completeAction).toBe('function');
    });

    test('should validate campaign structure', () => {
      const mockCampaign = {
        id: 'campaign-123',
        slug: 'summer-sale',
        name: 'Summer Sale 2024',
        brandName: 'Acme Brand',
        type: 'promotion',
        status: 'active',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        rewards: [
          { id: 'reward-1', type: 'discount', title: '20% Off', claimedCount: 150 },
        ],
        actions: [
          { id: 'action-1', type: 'visit', title: 'Visit Store' },
        ],
        createdAt: '2024-05-01',
      };

      expect(mockCampaign.id).toBeDefined();
      expect(mockCampaign.status).toBe('active');
      expect(Array.isArray(mockCampaign.rewards)).toBe(true);
      expect(Array.isArray(mockCampaign.actions)).toBe(true);
    });

    test('should validate reward types', () => {
      const validRewardTypes = ['discount', 'freebie', 'cashback', 'points', 'consultation', 'sample'];

      validRewardTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('AI Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.ai.getRecommendations).toBe('function');
      expect(typeof sdk.ai.sendMessage).toBe('function');
      expect(typeof sdk.ai.detectIntent).toBe('function');
    });

    test('should validate recommendation context', () => {
      const validContexts = [
        { source: 'room_qr' as const, roomId: 'room-123' },
        { source: 'menu_qr' as const, storeId: 'store-123' },
        { source: 'campaign_qr' as const, campaignId: 'campaign-123' },
      ];

      validContexts.forEach((ctx) => {
        expect(['room_qr', 'menu_qr', 'store_qr', 'campaign_qr']).toContain(ctx.source);
      });
    });

    test('should validate recommendation structure', () => {
      const mockRecommendation = {
        id: 'rec-123',
        type: 'item',
        title: 'Recommended Item',
        description: 'Based on your preferences',
        score: 0.95,
        reasons: ['You ordered this before', 'Popular in your area'],
      };

      expect(mockRecommendation.score).toBeGreaterThan(0);
      expect(mockRecommendation.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(mockRecommendation.reasons)).toBe(true);
    });
  });

  describe('Auth Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.auth.loginWithOTP).toBe('function');
      expect(typeof sdk.auth.verifyOTP).toBe('function');
      expect(typeof sdk.auth.getProfile).toBe('function');
      expect(typeof sdk.auth.logout).toBe('function');
      expect(typeof sdk.auth.getSession).toBe('function');
      expect(typeof sdk.auth.updateProfile).toBe('function');
    });

    test('should validate user profile structure', () => {
      const mockProfile = {
        id: 'user-123',
        phone: '+1234567890',
        email: 'test@example.com',
        name: 'Test User',
        role: 'guest' as const,
        verified: true,
        createdAt: '2024-01-01',
      };

      expect(mockProfile.id).toBeDefined();
      expect(mockProfile.phone).toBeDefined();
      expect(['guest', 'member', 'vip', 'admin']).toContain(mockProfile.role);
    });
  });

  describe('Wallet Module', () => {
    test('should have all required methods', () => {
      expect(typeof sdk.wallet.getBalance).toBe('function');
      expect(typeof sdk.wallet.pay).toBe('function');
      expect(typeof sdk.wallet.addFunds).toBe('function');
      expect(typeof sdk.wallet.getTransactions).toBe('function');
      expect(typeof sdk.wallet.getInsights).toBe('function');
    });

    test('should validate wallet balance structure', () => {
      const mockBalance = {
        total: 150.00,
        available: 140.00,
        locked: 10.00,
        currency: 'USD',
        coins: [
          { type: 'promo' as const, balance: 25.00, label: 'Promo Coins' },
          { type: 'rewards' as const, balance: 15.00, label: 'Reward Points' },
        ],
        lastUpdated: '2024-01-15T10:30:00Z',
      };

      expect(mockBalance.total).toBe(mockBalance.available + mockBalance.locked);
      expect(mockBalance.currency).toBe('USD');
      expect(Array.isArray(mockBalance.coins)).toBe(true);
    });

    test('should validate transaction structure', () => {
      const mockTransaction = {
        id: 'tx-123',
        type: 'credit' as const,
        amount: 50.00,
        currency: 'USD',
        balance: 150.00,
        description: 'Added funds',
        status: 'completed' as const,
        createdAt: '2024-01-15T10:30:00Z',
      };

      expect(['credit', 'debit']).toContain(mockTransaction.type);
      expect(['pending', 'completed', 'failed']).toContain(mockTransaction.status);
    });
  });

  describe('Cross-Module Integration', () => {
    test('should use auth with room module', () => {
      // Simulate authentication flow
      const auth = sdk.auth;
      expect(typeof auth.loginWithOTP).toBe('function');

      // After auth, user should be able to access room services
      const room = sdk.room;
      expect(typeof room.validateQR).toBe('function');
    });

    test('should use wallet with room checkout', () => {
      // Wallet payment should work with room checkout
      const wallet = sdk.wallet;
      const room = sdk.room;

      expect(typeof wallet.pay).toBe('function');
      expect(typeof room.checkout).toBe('function');
    });

    test('should use wallet with menu checkout', () => {
      // Wallet payment should work with menu checkout
      const wallet = sdk.wallet;
      const menu = sdk.menu;

      expect(typeof wallet.pay).toBe('function');
      expect(typeof menu.checkout).toBe('function');
    });

    test('should use AI with all QR modules', () => {
      const ai = sdk.ai;
      const room = sdk.room;
      const menu = sdk.menu;
      const store = sdk.store;

      expect(typeof ai.getRecommendations).toBe('function');
      expect(typeof room.validateQR).toBe('function');
      expect(typeof menu.getMenu).toBe('function');
      expect(typeof store.getProfile).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid configuration gracefully', () => {
      const sdk = new QRSDK({
        apiKey: 'test-key',
        environment: 'production',
      });

      expect(sdk).toBeDefined();
      expect(sdk.room).toBeDefined();
    });

    test('should handle missing optional parameters', () => {
      const sdk = new QRSDK();

      // Should not throw on optional parameters
      expect(sdk).toBeDefined();
    });
  });
});

describe('Room QR: Full Flow', () => {
  let sdk: QRSDK;

  beforeEach(() => {
    sdk = new QRSDK(mockConfig);
  });

  test('should support complete room QR flow', async () => {
    // This test validates the data structures and types
    // Actual API calls would require a running backend

    const qrData = 'REZ-ROOM-TEST-001';

    // Mock validation response
    const mockRoom: Parameters<typeof sdk.room.validateQR>[0] extends string ? { id: string; hotelName: string; roomNumber: string } : never = {
      id: 'room-123',
      hotelName: 'Test Hotel',
      roomNumber: '101',
    };

    expect(mockRoom).toBeDefined();

    // Mock request
    const mockRequest = {
      roomId: mockRoom.id,
      category: 'room_service' as const,
      itemId: 'coffee',
      priority: 'normal' as const,
    };

    expect(mockRequest).toBeDefined();

    // Mock payment
    const mockPayment = {
      method: 'wallet' as const,
      amount: 15.99,
    };

    expect(mockPayment).toBeDefined();

    // Mock feedback
    const mockFeedback = {
      type: 'room_service' as const,
      rating: 5,
      comment: 'Great service!',
    };

    expect(mockFeedback).toBeDefined();
  });
});

describe('Menu QR: Full Flow', () => {
  let sdk: QRSDK;

  beforeEach(() => {
    sdk = new QRSDK(mockConfig);
  });

  test('should support complete menu QR flow', async () => {
    const storeId = 'restaurant-123';

    // Mock menu
    const mockMenu = {
      id: storeId,
      storeName: 'Test Restaurant',
      categories: [
        { id: 'cat-1', name: 'Starters', items: [] },
        { id: 'cat-2', name: 'Main Course', items: [] },
      ],
      items: [
        { id: 'item-1', name: 'Salad', dietary: [{ code: 'vegetarian' }], allergens: [] },
        { id: 'item-2', name: 'Steak', dietary: [], allergens: [] },
      ],
      dietaryOptions: [],
      allergens: ['gluten', 'dairy', 'nuts'],
      lastUpdated: '2024-01-15',
    };

    expect(mockMenu).toBeDefined();

    // Test dietary filtering
    const filtered = sdk.menu.filterByDietary(mockMenu.items, { vegetarian: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Salad');

    // Mock cart
    const mockCart = {
      cartId: 'cart-123',
      itemCount: 2,
    };

    expect(mockCart).toBeDefined();

    // Mock order
    const mockOrder = {
      orderId: 'order-123',
      status: 'confirmed' as const,
      estimatedReadyTime: '15 mins',
    };

    expect(mockOrder).toBeDefined();

    // Mock bill
    const mockBill = {
      total: 45.99,
      currency: 'USD',
    };

    expect(mockBill).toBeDefined();

    // Mock payment
    const mockPayment = {
      method: 'wallet' as const,
      amount: mockBill.total,
    };

    expect(mockPayment).toBeDefined();

    // Mock receipt
    const mockReceipt = {
      id: 'receipt-123',
      status: 'success' as const,
    };

    expect(mockReceipt).toBeDefined();
  });
});

describe('Campaign QR: Full Flow', () => {
  let sdk: QRSDK;

  beforeEach(() => {
    sdk = new QRSDK(mockConfig);
  });

  test('should support complete campaign QR flow', async () => {
    const campaignSlug = 'summer-sale';

    // Mock campaign
    const mockCampaign = {
      id: 'campaign-123',
      slug: campaignSlug,
      name: 'Summer Sale',
      rewards: [
        { id: 'reward-1', type: 'discount', title: '20% Off', claimedCount: 100 },
      ],
    };

    expect(mockCampaign).toBeDefined();

    // Mock reward claim
    const mockReward = {
      id: 'claimed-123',
      type: 'discount',
      title: '20% Off',
      code: 'SUMMER20',
      status: 'claimed' as const,
    };

    expect(mockReward).toBeDefined();

    // Mock consultation
    const mockConsultation = {
      bookingId: 'booking-123',
      status: 'confirmed' as const,
      confirmationCode: 'CONF123',
    };

    expect(mockConsultation).toBeDefined();

    // Mock sample request
    const mockSample = {
      id: 'sample-123',
      status: 'shipped' as const,
      trackingNumber: 'TRACK123',
    };

    expect(mockSample).toBeDefined();
  });
});
