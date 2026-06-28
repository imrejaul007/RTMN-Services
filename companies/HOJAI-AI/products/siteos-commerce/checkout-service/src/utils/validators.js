/**
 * Validation utilities for checkout service
 */

/**
 * Validate address object
 */
export function validateAddress(address) {
  const errors = [];

  if (!address) {
    return { valid: false, errors: ['Address is required'] };
  }

  if (!address.name || address.name.trim().length < 2) {
    errors.push('Name is required (min 2 characters)');
  }

  if (!address.phone || !/^[\d\s\-+()]{10,}$/.test(address.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!address.line1 || address.line1.trim().length < 5) {
    errors.push('Address line 1 is required (min 5 characters)');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!address.state || address.state.trim().length < 2) {
    errors.push('State is required');
  }

  if (!address.pincode || !/^[\d\-]{5,10}$/.test(address.pincode)) {
    errors.push('Valid pincode is required');
  }

  if (!address.country || address.country.trim().length < 2) {
    errors.push('Country is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate cart items
 */
export function validateCart(items) {
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, errors: ['Cart must contain at least one item'] };
  }

  items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item ${index + 1}: productId is required`);
    }

    if (!item.name || item.name.trim().length === 0) {
      errors.push(`Item ${index + 1}: name is required`);
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      errors.push(`Item ${index + 1}: valid price is required`);
    }

    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      errors.push(`Item ${index + 1}: quantity must be at least 1`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate shipping method
 */
export function validateShippingMethod(method) {
  const validMethods = ['standard', 'express', 'pickup'];
  if (!validMethods.includes(method)) {
    return {
      valid: false,
      errors: [`Invalid shipping method. Must be one of: ${validMethods.join(', ')}`]
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate payment method
 */
export function validatePaymentMethod(method) {
  const validMethods = ['razorpay', 'upi', 'card', 'wallet'];
  if (!validMethods.includes(method)) {
    return {
      valid: false,
      errors: [`Invalid payment method. Must be one of: ${validMethods.join(', ')}`]
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate order ID format
 */
export function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate company ID format
 */
export function isValidCompanyId(str) {
  if (!str || typeof str !== 'string') return false;
  return str.length >= 3 && str.length <= 50;
}

/**
 * Calculate order totals
 */
export function calculateTotals(items, shippingCost = 0, discount = 0, taxRate = 0.18) {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + shippingCost + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost,
    discount,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}