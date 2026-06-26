/**
 * Commerce Connectors - Shopify, WooCommerce, Magento, BigCommerce, etc.
 */

const commerceConnectors = [
  // ============= SHOPIFY =============
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'commerce',
    description: 'E-commerce platform for online stores',
    authType: 'oauth2',
    logo: 'shopify-logo.svg',
    capabilities: ['products', 'orders', 'customers', 'inventory', 'fulfillment', 'discounts', 'storefront'],
    actions: {
      getProducts: {
        description: 'Get all products',
        params: ['limit', 'sinceId', 'status']
      },
      createProduct: {
        description: 'Create a new product',
        params: ['title', 'bodyHtml', 'vendor', 'productType', 'variants']
      },
      updateProduct: {
        description: 'Update a product',
        params: ['productId', 'fields']
      },
      deleteProduct: {
        description: 'Delete a product',
        params: ['productId']
      },
      getProduct: {
        description: 'Get product by ID',
        params: ['productId']
      },
      getOrders: {
        description: 'Get all orders',
        params: ['limit', 'status', 'createdAtMin']
      },
      createOrder: {
        description: 'Create an order',
        params: ['lineItems', 'customer', 'billingAddress', 'shippingAddress']
      },
      updateOrder: {
        description: 'Update an order',
        params: ['orderId', 'fields']
      },
      fulfillOrder: {
        description: 'Fulfill an order',
        params: ['orderId', 'lineItems', 'trackingNumber']
      },
      getOrder: {
        description: 'Get order by ID',
        params: ['orderId']
      },
      getCustomers: {
        description: 'Get all customers',
        params: ['limit', 'sinceId']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['email', 'firstName', 'lastName', 'password']
      },
      updateCustomer: {
        description: 'Update a customer',
        params: ['customerId', 'fields']
      },
      getCustomer: {
        description: 'Get customer by ID',
        params: ['customerId']
      },
      getInventoryLevels: {
        description: 'Get inventory levels',
        params: ['locationId', 'inventoryItemIds']
      },
      setInventoryLevel: {
        description: 'Set inventory level',
        params: ['inventoryItemId', 'locationId', 'available']
      },
      createDiscount: {
        description: 'Create a discount code',
        params: ['code', 'discountType', 'value', 'minimumAmount']
      },
      getFulfillments: {
        description: 'Get order fulfillments',
        params: ['orderId']
      },
      createFulfillment: {
        description: 'Create fulfillment for order',
        params: ['orderId', 'trackingNumber', 'lineItems']
      },
      getLocations: {
        description: 'Get all locations',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.shop || !credentials.accessToken) {
        throw new Error('Missing Shopify credentials');
      }
      return { success: true, shop: credentials.shop };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 1234, title: 'Product Name', variants: [{ price: '29.99' }] }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Shopify`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Shopify`);
      return { success: true };
    }
  },

  // ============= WOOCOMMERCE =============
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'commerce',
    description: 'WordPress e-commerce plugin',
    authType: 'oauth2',
    logo: 'woocommerce-logo.svg',
    capabilities: ['products', 'orders', 'customers', 'coupons', 'reviews', 'webhooks'],
    actions: {
      getProducts: {
        description: 'Get all products',
        params: ['perPage', 'page', 'category', 'status']
      },
      createProduct: {
        description: 'Create a new product',
        params: ['name', 'type', 'regularPrice', 'description', 'categories']
      },
      updateProduct: {
        description: 'Update a product',
        params: ['id', 'fields']
      },
      deleteProduct: {
        description: 'Delete a product',
        params: ['id', 'force']
      },
      getProduct: {
        description: 'Get product by ID',
        params: ['id']
      },
      getOrders: {
        description: 'Get all orders',
        params: ['perPage', 'status', 'after']
      },
      createOrder: {
        description: 'Create an order',
        params: ['lineItems', 'billing', 'shipping', 'customerId']
      },
      updateOrder: {
        description: 'Update an order',
        params: ['id', 'fields']
      },
      getOrder: {
        description: 'Get order by ID',
        params: ['id']
      },
      getCustomers: {
        description: 'Get all customers',
        params: ['perPage', 'role']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['email', 'firstName', 'lastName', 'username', 'password']
      },
      updateCustomer: {
        description: 'Update a customer',
        params: ['id', 'fields']
      },
      getCustomer: {
        description: 'Get customer by ID',
        params: ['id']
      },
      createCoupon: {
        description: 'Create a coupon',
        params: ['code', 'discountType', 'amount', 'minimumAmount']
      },
      getCoupons: {
        description: 'Get all coupons',
        params: ['perPage']
      },
      getProductReviews: {
        description: 'Get product reviews',
        params: ['productId', 'perPage']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.siteUrl || !credentials.consumerKey) {
        throw new Error('Missing WooCommerce credentials');
      }
      return { success: true, site: credentials.siteUrl };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from WooCommerce`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to WooCommerce`);
      return { success: true };
    }
  },

  // ============= MAGENTO =============
  {
    id: 'magento',
    name: 'Magento / Adobe Commerce',
    category: 'commerce',
    description: 'Enterprise e-commerce platform',
    authType: 'oauth2',
    logo: 'magento-logo.svg',
    capabilities: ['products', 'orders', 'customers', 'inventory', 'categories', 'prices', 'cart'],
    actions: {
      getProducts: {
        description: 'Get all products',
        params: ['searchCriteria', 'fields']
      },
      createProduct: {
        description: 'Create a new product',
        params: ['product']
      },
      updateProduct: {
        description: 'Update a product',
        params: ['productId', 'product']
      },
      getProduct: {
        description: 'Get product by SKU',
        params: ['sku']
      },
      getOrders: {
        description: 'Get orders',
        params: ['searchCriteria']
      },
      getOrder: {
        description: 'Get order by ID',
        params: ['orderId']
      },
      getCustomers: {
        description: 'Get customers',
        params: ['searchCriteria']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['customer']
      },
      getCustomer: {
        description: 'Get customer by ID',
        params: ['customerId']
      },
      updateCustomer: {
        description: 'Update a customer',
        params: ['customerId', 'customer']
      },
      getCategories: {
        description: 'Get all categories',
        params: ['rootCategoryId']
      },
      createCategory: {
        description: 'Create a category',
        params: ['category']
      },
      getInventory: {
        description: 'Get inventory by SKU',
        params: ['sku']
      },
      updateInventory: {
        description: 'Update inventory',
        params: ['sku', 'stockItem']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.baseUrl || !credentials.accessToken) {
        throw new Error('Missing Magento credentials');
      }
      return { success: true, baseUrl: credentials.baseUrl };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Magento`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Magento`);
      return { success: true };
    }
  },

  // ============= BIGCOMMERCE =============
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    category: 'commerce',
    description: 'SaaS e-commerce platform',
    authType: 'oauth2',
    logo: 'bigcommerce-logo.svg',
    capabilities: ['products', 'orders', 'customers', 'categories', 'coupons', 'webhooks'],
    actions: {
      getProducts: {
        description: 'Get all products',
        params: ['limit', 'page', 'category']
      },
      createProduct: {
        description: 'Create a new product',
        params: ['name', 'price', 'type', 'weight']
      },
      updateProduct: {
        description: 'Update a product',
        params: ['productId', 'fields']
      },
      getProduct: {
        description: 'Get product by ID',
        params: ['productId']
      },
      getOrders: {
        description: 'Get orders',
        params: ['limit', 'status', 'minId']
      },
      createOrder: {
        description: 'Create order (internal)',
        params: ['customerId', 'lineItems', 'billingAddress']
      },
      getOrder: {
        description: 'Get order by ID',
        params: ['orderId']
      },
      updateOrder: {
        description: 'Update order',
        params: ['orderId', 'fields']
      },
      getCustomers: {
        description: 'Get customers',
        params: ['limit', 'page']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['firstName', 'lastName', 'email', 'phone']
      },
      getCustomer: {
        description: 'Get customer by ID',
        params: ['customerId']
      },
      updateCustomer: {
        description: 'Update customer',
        params: ['customerId', 'fields']
      },
      createCoupon: {
        description: 'Create a coupon',
        params: ['code', 'type', 'value', 'minPurchase']
      },
      getChannels: {
        description: 'Get sales channels',
        params: []
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.storeHash || !credentials.accessToken) {
        throw new Error('Missing BigCommerce credentials');
      }
      return { success: true, store: credentials.storeHash };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from BigCommerce`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to BigCommerce`);
      return { success: true };
    }
  },

  // ============= MAGENTO OPEN SOURCE =============
  {
    id: 'magento2',
    name: 'Magento 2 Open Source',
    category: 'commerce',
    description: 'Open source Magento 2',
    authType: 'api_key',
    logo: 'magento-logo.svg',
    capabilities: ['products', 'orders', 'customers', 'inventory'],
    actions: {
      getProducts: {
        description: 'Get all products',
        params: ['searchCriteria']
      },
      createProduct: {
        description: 'Create a new product',
        params: ['product']
      },
      getOrders: {
        description: 'Get orders',
        params: ['searchCriteria']
      },
      getCustomers: {
        description: 'Get customers',
        params: ['searchCriteria']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['customer']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.baseUrl || !credentials.apiUser || !credentials.apiKey) {
        throw new Error('Missing Magento 2 credentials');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Magento 2`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Magento 2`);
      return { success: true };
    }
  }
];

export default {
  list: commerceConnectors
};
