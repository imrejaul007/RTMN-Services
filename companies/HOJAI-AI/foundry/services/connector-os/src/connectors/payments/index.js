/**
 * Payment Connectors - Stripe, Razorpay, PayPal, Square, etc.
 */

const paymentConnectors = [
  // ============= STRIPE =============
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    description: 'Online payment processing and financial infrastructure',
    authType: 'api_key',
    logo: 'stripe-logo.svg',
    capabilities: ['payments', 'subscriptions', 'invoicing', 'connect', 'billing', 'fraud-detection', 'treasury'],
    actions: {
      createPaymentIntent: {
        description: 'Create a payment intent',
        params: ['amount', 'currency', 'customerId', 'metadata']
      },
      confirmPayment: {
        description: 'Confirm a payment',
        params: ['paymentIntentId']
      },
      getPaymentIntent: {
        description: 'Get payment intent details',
        params: ['paymentIntentId']
      },
      listPayments: {
        description: 'List all payments',
        params: ['limit', 'customerId', 'status']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['email', 'name', 'metadata']
      },
      getCustomer: {
        description: 'Get customer details',
        params: ['customerId']
      },
      listCustomers: {
        description: 'List all customers',
        params: ['limit', 'email']
      },
      createSubscription: {
        description: 'Create a subscription',
        params: ['customerId', 'priceId', 'interval']
      },
      cancelSubscription: {
        description: 'Cancel a subscription',
        params: ['subscriptionId']
      },
      getSubscription: {
        description: 'Get subscription details',
        params: ['subscriptionId']
      },
      updateSubscription: {
        description: 'Update a subscription',
        params: ['subscriptionId', 'fields']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['customerId', 'items', 'dueDate']
      },
      sendInvoice: {
        description: 'Send an invoice',
        params: ['invoiceId']
      },
      createRefund: {
        description: 'Create a refund',
        params: ['paymentIntentId', 'amount', 'reason']
      },
      getBalance: {
        description: 'Get account balance',
        params: []
      },
      createConnectAccount: {
        description: 'Create a Connect account (for marketplaces)',
        params: ['type', 'email', 'country']
      },
      createTransfer: {
        description: 'Transfer funds to a connected account',
        params: ['amount', 'currency', 'destinationAccountId']
      },
      createPayout: {
        description: 'Create a payout to bank',
        params: ['amount', 'currency']
      },
      createCheckoutSession: {
        description: 'Create a checkout session',
        params: ['lineItems', 'mode', 'successUrl', 'cancelUrl']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.secretKey) {
        throw new Error('Missing Stripe secret key');
      }
      return { success: true, mode: credentials.secretKey.startsWith('sk_live') ? 'live' : 'test' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'pi_xxx', amount: 5000, status: 'succeeded', customer: 'cus_xxx' },
          { id: 'pi_yyy', amount: 10000, status: 'pending', customer: 'cus_yyy' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Stripe`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Stripe`);
      return { success: true };
    }
  },

  // ============= RAZORPAY =============
  {
    id: 'razorpay',
    name: 'Razorpay',
    category: 'payments',
    description: 'Indian payment gateway and banking',
    authType: 'api_key',
    logo: 'razorpay-logo.svg',
    capabilities: ['payments', 'refunds', 'settlements', 'invoices', 'subscriptions', 'cards', 'upi', 'wallets'],
    actions: {
      createOrder: {
        description: 'Create a payment order',
        params: ['amount', 'currency', 'receipt', 'notes']
      },
      getOrder: {
        description: 'Get order details',
        params: ['orderId']
      },
      createPayment: {
        description: 'Create a payment link',
        params: ['amount', 'currency', 'description', 'customerEmail', 'customerMobile']
      },
      getPayment: {
        description: 'Get payment details',
        params: ['paymentId']
      },
      capturePayment: {
        description: 'Capture an authorized payment',
        params: ['paymentId', 'amount']
      },
      refundPayment: {
        description: 'Refund a payment',
        params: ['paymentId', 'amount', 'speed']
      },
      getRefunds: {
        description: 'List all refunds',
        params: ['paymentId', 'limit']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['amount', 'description', 'customerEmail', 'dueDate']
      },
      sendInvoice: {
        description: 'Send an invoice',
        params: ['invoiceId']
      },
      getSettlement: {
        description: 'Get settlement details',
        params: ['settlementId']
      },
      createVirtualAccount: {
        description: 'Create a virtual account for payments',
        params: ['description', 'receivers']
      },
      addBankTransfer: {
        description: 'Add bank account for settlements',
        params: ['accountNumber', 'ifsc', 'beneficiaryName']
      },
      createSubscription: {
        description: 'Create a subscription',
        params: ['planId', 'customerId', 'totalCount']
      },
      cancelSubscription: {
        description: 'Cancel a subscription',
        params: ['subscriptionId']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['name', 'email', 'mobile', 'gstin']
      },
      getCustomer: {
        description: 'Get customer details',
        params: ['customerId']
      },
      listCustomers: {
        description: 'List all customers',
        params: ['limit']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.keyId || !credentials.keySecret) {
        throw new Error('Missing Razorpay credentials');
      }
      return { success: true, mode: credentials.keyId.startsWith('rzp_live') ? 'live' : 'test' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'pay_xxx', amount: 50000, status: 'captured', method: 'card' },
          { id: 'pay_yyy', amount: 100000, status: 'pending', method: 'upi' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Razorpay`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Razorpay`);
      return { success: true };
    }
  },

  // ============= PAYPAL =============
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'payments',
    description: 'Global online payments platform',
    authType: 'oauth2',
    logo: 'paypal-logo.svg',
    capabilities: ['payments', 'payouts', 'invoicing', 'subscriptions', 'checkout', 'venmo'],
    actions: {
      createOrder: {
        description: 'Create a payment order',
        params: ['amount', 'currency', 'intent', 'returnUrl', 'cancelUrl']
      },
      captureOrder: {
        description: 'Capture an order after buyer approval',
        params: ['orderId']
      },
      getOrder: {
        description: 'Get order details',
        params: ['orderId']
      },
      createSubscription: {
        description: 'Create a subscription',
        params: ['planId', 'customerId', 'startTime']
      },
      cancelSubscription: {
        description: 'Cancel a subscription',
        params: ['subscriptionId']
      },
      getSubscription: {
        description: 'Get subscription details',
        params: ['subscriptionId']
      },
      createPayout: {
        description: 'Send money to multiple recipients',
        params: ['items', 'syncMode']
      },
      getPayout: {
        description: 'Get payout details',
        params: ['payoutItemId']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['detail', 'configuration', 'customFields']
      },
      sendInvoice: {
        description: 'Send an invoice',
        params: ['invoiceId']
      },
      refundTransaction: {
        description: 'Refund a transaction',
        params: ['transactionId', 'amount', 'reason']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.clientId || !credentials.secret) {
        throw new Error('Missing PayPal credentials');
      }
      return { success: true, mode: credentials.mode || 'sandbox' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'ORDER-xxx', status: 'COMPLETED', amount: { value: '50.00', currency: 'USD' } }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from PayPal`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to PayPal`);
      return { success: true };
    }
  },

  // ============= SQUARE =============
  {
    id: 'square',
    name: 'Square',
    category: 'payments',
    description: 'Point of sale and payment processing',
    authType: 'oauth2',
    logo: 'square-logo.svg',
    capabilities: ['payments', 'invoices', 'items', 'inventory', 'customers', 'orders', 'subscriptions'],
    actions: {
      createPayment: {
        description: 'Create a payment',
        params: ['sourceId', 'amountMoney', 'customerId', 'locationId']
      },
      getPayment: {
        description: 'Get payment details',
        params: ['paymentId']
      },
      listPayments: {
        description: 'List payments',
        params: ['locationId', 'beginTime', 'endTime']
      },
      refundPayment: {
        description: 'Refund a payment',
        params: ['paymentId', 'amountMoney', 'reason']
      },
      createCustomer: {
        description: 'Create a customer',
        params: ['givenName', 'familyName', 'emailAddress', 'phoneNumber']
      },
      getCustomer: {
        description: 'Get customer details',
        params: ['customerId']
      },
      listCustomers: {
        description: 'List all customers',
        params: ['limit', 'cursor']
      },
      createOrder: {
        description: 'Create an order',
        params: ['locationId', 'lineItems', 'discounts']
      },
      getOrder: {
        description: 'Get order details',
        params: ['orderId']
      },
      createInvoice: {
        description: 'Create an invoice',
        params: ['locationId', 'orderId', 'customerId', 'dueDate']
      },
      publishInvoice: {
        description: 'Publish an invoice',
        params: ['invoiceId']
      },
      listLocations: {
        description: 'List all locations',
        params: []
      },
      createSubscription: {
        description: 'Create a subscription',
        params: ['locationId', 'customerId', 'planId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Square access token');
      }
      return { success: true, merchantId: 'MERCHANT_ID' };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'xxx', amountMoney: { amount: 5000, currency: 'USD' }, status: 'COMPLETED' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Square`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Square`);
      return { success: true };
    }
  },

  // ============= PHONEPE =============
  {
    id: 'phonepe',
    name: 'PhonePe',
    category: 'payments',
    description: 'Indian digital payments platform',
    authType: 'api_key',
    logo: 'phonepe-logo.svg',
    capabilities: ['payments', 'refunds', 'settlements', 'subscriptions'],
    actions: {
      createPayment: {
        description: 'Create a payment',
        params: ['amount', 'merchantId', 'orderId', 'callbackUrl', 'redirectUrl']
      },
      getPaymentStatus: {
        description: 'Get payment status',
        params: ['merchantId', 'transactionId']
      },
      initiateRefund: {
        description: 'Initiate a refund',
        params: ['originalTransactionId', 'amount', 'refundId']
      },
      getRefundStatus: {
        description: 'Get refund status',
        params: ['merchantId', 'refundId']
      },
      createSubscription: {
        description: 'Create an auto-pay mandate',
        params: ['customerPhone', 'amount', 'merchantId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.merchantId || !credentials.saltKey) {
        throw new Error('Missing PhonePe credentials');
      }
      return { success: true, merchantId: credentials.merchantId };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from PhonePe`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to PhonePe`);
      return { success: true };
    }
  },

  // ============= CASHFREE =============
  {
    id: 'cashfree',
    name: 'Cashfree',
    category: 'payments',
    description: 'Indian payment gateway and treasury',
    authType: 'api_key',
    logo: 'cashfree-logo.svg',
    capabilities: ['payments', 'payouts', 'vendor-payments', 'refunds'],
    actions: {
      createOrder: {
        description: 'Create a payment order',
        params: ['orderId', 'orderAmount', 'customerEmail', 'customerPhone']
      },
      getOrder: {
        description: 'Get order details',
        params: ['orderId']
      },
      createPaymentLink: {
        description: 'Create a payment link',
        params: ['customerEmail', 'customerMobile', 'amount', 'linkNote']
      },
      getPaymentLinkStatus: {
        description: 'Get payment link status',
        params: ['linkId']
      },
      initiateRefund: {
        description: 'Initiate refund',
        params: ['refundId', 'orderId', 'refundAmount', 'refundType']
      },
      addBankAccount: {
        description: 'Add beneficiary bank account',
        params: ['beneId', 'name', 'accountNo', 'ifsc']
      },
      createPayout: {
        description: 'Create payout to bank account',
        params: ['beneId', 'amount', 'transferId']
      },
      createBulkPayout: {
        description: 'Create bulk payouts',
        params: ['batchId', 'payouts']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.clientId || !credentials.clientSecret) {
        throw new Error('Missing Cashfree credentials');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Cashfree`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Cashfree`);
      return { success: true };
    }
  }
];

export default {
  list: paymentConnectors
};
