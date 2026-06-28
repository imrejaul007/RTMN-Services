/**
 * useCommerce - Hook for commerce functionality in HOJAI Widget
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  Product,
  ProductSearchParams,
  Cart,
  CartItem,
  Order,
  Address,
  PaymentInitiation,
  LoyaltyProfile,
  ApiResponse,
} from '../components/types';

const API_BASE = 'http://localhost:5476'; // Product Catalog default

interface UseCommerceOptions {
  companyId: string;
  apiKey: string;
  sessionId: string;
  apiBaseUrl?: string;
}

export function useCommerce(options: UseCommerceOptions) {
  const { companyId, apiKey, sessionId, apiBaseUrl = API_BASE } = options;

  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Company-Id': companyId,
  };

  // Fetch cart
  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl.replace('5476', '5477')}/api/cart/${sessionId}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  }, [sessionId, apiBaseUrl, companyId, apiKey]);

  // Search products
  const searchProducts = useCallback(
    async (params: ProductSearchParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/products/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params),
        });
        const data = await res.json();
        setProducts(data.products || []);
        return data.products || [];
      } catch (err) {
        setError('Failed to search products');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, companyId, apiKey]
  );

  // Get single product
  const getProduct = useCallback(
    async (productId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/products/${productId}`, { headers });
        const data = await res.json();
        setCurrentProduct(data.product);
        return data.product;
      } catch (err) {
        setError('Failed to get product');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, companyId, apiKey]
  );

  // Add to cart
  const addToCart = useCallback(
    async (item: Omit<CartItem, 'itemId'>) => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl.replace('5476', '5477')}/api/cart/${sessionId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify(item),
        });
        const data = await res.json();
        setCart(data.cart);
        return data.cart;
      } catch (err) {
        setError('Failed to add to cart');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Update cart item quantity
  const updateCartItem = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        const res = await fetch(
          `${apiBaseUrl.replace('5476', '5477')}/api/cart/${sessionId}/items/${itemId}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({ quantity }),
          }
        );
        const data = await res.json();
        setCart(data.cart);
        return data.cart;
      } catch (err) {
        setError('Failed to update cart');
        return null;
      }
    },
    [sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Remove from cart
  const removeFromCart = useCallback(
    async (itemId: string) => {
      try {
        const res = await fetch(
          `${apiBaseUrl.replace('5476', '5477')}/api/cart/${sessionId}/items/${itemId}`,
          {
            method: 'DELETE',
            headers,
          }
        );
        const data = await res.json();
        setCart(data.cart);
        return data.cart;
      } catch (err) {
        setError('Failed to remove from cart');
        return null;
      }
    },
    [sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Apply coupon
  const applyCoupon = useCallback(
    async (couponCode: string) => {
      try {
        const res = await fetch(`${apiBaseUrl.replace('5476', '5477')}/api/cart/${sessionId}/coupon`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ couponCode }),
        });
        const data = await res.json();
        if (data.success) {
          setCart(data.cart);
          return { success: true };
        }
        return { success: false, error: data.error };
      } catch (err) {
        return { success: false, error: 'Failed to apply coupon' };
      }
    },
    [sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Create order (checkout)
  const createOrder = useCallback(
    async (shippingAddress: Address, shippingMethod?: string) => {
      setLoading(true);
      try {
        // Initiate checkout
        const checkoutRes = await fetch(`${apiBaseUrl.replace('5476', '5478')}/api/checkout/initiate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId, shippingAddress, shippingMethod }),
        });
        const checkoutData = await checkoutRes.json();

        if (!checkoutData.order) {
          return { success: false, error: checkoutData.error };
        }

        return { success: true, order: checkoutData.order };
      } catch (err) {
        return { success: false, error: 'Failed to create order' };
      } finally {
        setLoading(false);
      }
    },
    [sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Initiate payment
  const initiatePayment = useCallback(
    async (orderId: string, method: string = 'razorpay') => {
      try {
        const res = await fetch(`${apiBaseUrl.replace('5476', '5479')}/api/payments/initiate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId,
            amount: cart?.total || 0,
            customerId: sessionId,
            method,
          }),
        });
        const data = await res.json();
        return data.payment as PaymentInitiation;
      } catch (err) {
        setError('Failed to initiate payment');
        return null;
      }
    },
    [cart, sessionId, apiBaseUrl, companyId, apiKey]
  );

  // Get loyalty balance
  const getLoyaltyBalance = useCallback(
    async (customerId: string) => {
      try {
        const res = await fetch(`${apiBaseUrl.replace('5476', '5481')}/api/loyalty/balance/${customerId}`, {
          headers,
        });
        const data = await res.json();
        return data as LoyaltyProfile;
      } catch (err) {
        return null;
      }
    },
    [apiBaseUrl, companyId, apiKey]
  );

  // Load cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    // State
    cart,
    products,
    currentProduct,
    loading,
    error,

    // Cart actions
    addToCart,
    updateCartItem,
    removeFromCart,
    applyCoupon,
    fetchCart,

    // Product actions
    searchProducts,
    getProduct,

    // Checkout actions
    createOrder,
    initiatePayment,

    // Loyalty actions
    getLoyaltyBalance,

    // Helpers
    clearError: () => setError(null),
    itemCount: cart?.itemCount || 0,
    subtotal: cart?.subtotal || 0,
    total: cart?.total || 0,
  };
}

export default useCommerce;