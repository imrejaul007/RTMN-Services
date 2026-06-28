/**
 * CheckoutFlow - Multi-step checkout component
 */

import * as React from 'react';
import type { Cart, Address, ShippingMethod, Order } from './types';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'confirm';

interface CheckoutFlowProps {
  cart: Cart | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (order: Order) => void;
  onSubmitOrder: (data: CheckoutData) => Promise<Order | null>;
  currency?: string;
}

interface CheckoutData {
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod?: string;
  paymentMethod: string;
}

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'standard', name: 'Standard Delivery', description: '5-7 business days', price: 0 },
  { id: 'express', name: 'Express Delivery', description: '2-3 business days', price: 99 },
  { id: 'same-day', name: 'Same Day Delivery', description: 'Within 4 hours', price: 249 },
];

const PAYMENT_METHODS = [
  { id: 'razorpay', name: 'Credit/Debit Card, UPI, Net Banking', icon: '💳' },
  { id: 'upi', name: 'UPI App', icon: '📱' },
  { id: 'wallet', name: 'Wallet', icon: '👛' },
];

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  cart,
  isOpen,
  onClose,
  onComplete,
  onSubmitOrder,
  currency = '₹',
}) => {
  const [step, setStep] = React.useState<CheckoutStep>('address');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Address form
  const [address, setAddress] = React.useState<Address>({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  // Shipping
  const [selectedShipping, setSelectedShipping] = React.useState('standard');

  // Payment
  const [selectedPayment, setSelectedPayment] = React.useState('razorpay');

  const selectedShippingMethod = SHIPPING_METHODS.find((m) => m.id === selectedShipping);
  const shippingCost = selectedShippingMethod?.price || 0;
  const total = (cart?.total || 0) + shippingCost;

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setStep('shipping');
  };

  const handleShippingSubmit = () => {
    setStep('payment');
  };

  const handlePaymentSubmit = () => {
    setStep('confirm');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const order = await onSubmitOrder({
        shippingAddress: address,
        shippingMethod: selectedShipping,
        paymentMethod: selectedPayment,
      });
      if (order) {
        onComplete(order);
      } else {
        setError('Failed to place order. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = (field: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const formatPrice = (price: number) => `${currency}${price.toLocaleString()}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Checkout</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        {/* Progress */}
        <div style={styles.progress}>
          {['address', 'shipping', 'payment', 'confirm'].map((s, i) => (
            <div
              key={s}
              style={{
                ...styles.progressStep,
                ...(step === s ? styles.progressStepActive : {}),
                ...(['address', 'shipping', 'payment', 'confirm'].indexOf(step) > i
                  ? styles.progressStepComplete
                  : {}),
              }}
            >
              <span>{i + 1}</span>
              <small>{s.charAt(0).toUpperCase() + s.slice(1)}</small>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}

          {/* Address Step */}
          {step === 'address' && (
            <form onSubmit={handleAddressSubmit} style={styles.form}>
              <h3 style={styles.stepTitle}>Shipping Address</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => updateAddress('name', e.target.value)}
                    style={styles.input}
                    placeholder="Enter full name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => updateAddress('phone', e.target.value)}
                    style={styles.input}
                    placeholder="10-digit phone"
                  />
                </div>
                <div style={styles.formGroup} style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={address.email}
                    onChange={(e) => updateAddress('email', e.target.value)}
                    style={styles.input}
                    placeholder="email@example.com"
                  />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label>Address Line 1 *</label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={(e) => updateAddress('line1', e.target.value)}
                    style={styles.input}
                    placeholder="House/Flat No., Street"
                  />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    value={address.line2}
                    onChange={(e) => updateAddress('line2', e.target.value)}
                    style={styles.input}
                    placeholder="Landmark, Area"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => updateAddress('city', e.target.value)}
                    style={styles.input}
                    placeholder="City"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => updateAddress('state', e.target.value)}
                    style={styles.input}
                    placeholder="State"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Pincode *</label>
                  <input
                    type="text"
                    value={address.pincode}
                    onChange={(e) => updateAddress('pincode', e.target.value)}
                    style={styles.input}
                    placeholder="6-digit pincode"
                  />
                </div>
              </div>
              <button type="submit" style={styles.primaryButton}>
                Continue to Shipping →
              </button>
            </form>
          )}

          {/* Shipping Step */}
          {step === 'shipping' && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Shipping Method</h3>
              {SHIPPING_METHODS.map((method) => (
                <label
                  key={method.id}
                  style={{
                    ...styles.optionCard,
                    ...(selectedShipping === method.id ? styles.optionCardSelected : {}),
                  }}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedShipping === method.id}
                    onChange={() => setSelectedShipping(method.id)}
                    style={styles.radio}
                  />
                  <div style={styles.optionContent}>
                    <span style={styles.optionName}>{method.name}</span>
                    <span style={styles.optionDesc}>{method.description}</span>
                  </div>
                  <span style={styles.optionPrice}>
                    {method.price === 0 ? 'FREE' : formatPrice(method.price)}
                  </span>
                </label>
              ))}
              <button style={styles.primaryButton} onClick={handleShippingSubmit}>
                Continue to Payment →
              </button>
              <button style={styles.backButton} onClick={() => setStep('address')}>
                ← Back
              </button>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Payment Method</h3>
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  style={{
                    ...styles.optionCard,
                    ...(selectedPayment === method.id ? styles.optionCardSelected : {}),
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={selectedPayment === method.id}
                    onChange={() => setSelectedPayment(method.id)}
                    style={styles.radio}
                  />
                  <span style={styles.optionIcon}>{method.icon}</span>
                  <span style={styles.optionName}>{method.name}</span>
                </label>
              ))}
              <button style={styles.primaryButton} onClick={handlePaymentSubmit}>
                Review Order →
              </button>
              <button style={styles.backButton} onClick={() => setStep('shipping')}>
                ← Back
              </button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Review Your Order</h3>

              <div style={styles.reviewSection}>
                <h4>Shipping Address</h4>
                <p>{address.name}</p>
                <p>{address.line1}{address.line2 && `, ${address.line2}`}</p>
                <p>{address.city}, {address.state} {address.pincode}</p>
                <p>{address.phone}</p>
              </div>

              <div style={styles.reviewSection}>
                <h4>Shipping Method</h4>
                <p>{selectedShippingMethod?.name} - {formatPrice(shippingCost)}</p>
              </div>

              <div style={styles.reviewSection}>
                <h4>Payment Method</h4>
                <p>{PAYMENT_METHODS.find((m) => m.id === selectedPayment)?.name}</p>
              </div>

              <div style={styles.reviewSection}>
                <h4>Order Summary</h4>
                <div style={styles.summaryLine}>
                  <span>Subtotal</span>
                  <span>{formatPrice(cart?.subtotal || 0)}</span>
                </div>
                {cart?.discount && cart.discount > 0 && (
                  <div style={styles.summaryLine}>
                    <span>Discount</span>
                    <span style={styles.discount}>-{formatPrice(cart.discount)}</span>
                  </div>
                )}
                <div style={styles.summaryLine}>
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                </div>
                <div style={{ ...styles.summaryLine, ...styles.totalLine }}>
                  <span>Total</span>
                  <span style={styles.total}>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                style={styles.placeOrderButton}
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Place Order • ${formatPrice(total)}`}
              </button>
              <button style={styles.backButton} onClick={() => setStep('payment')}>
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    width: '500px',
    maxWidth: '95%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #334155',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '20px',
    cursor: 'pointer',
  },
  progress: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#1E293B',
    borderBottom: '1px solid #334155',
  },
  progressStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748B',
  },
  progressStepActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  progressStepComplete: {
    color: '#22C55E',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  error: {
    backgroundColor: '#7F1D1D',
    color: '#FCA5A5',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    margin: '0 0 16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  input: {
    padding: '10px 12px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
  },
  radio: {
    accentColor: '#3B82F6',
  },
  optionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  optionName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F1F5F9',
  },
  optionDesc: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  optionPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#22C55E',
  },
  optionIcon: {
    fontSize: '24px',
  },
  reviewSection: {
    backgroundColor: '#1E293B',
    padding: '14px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  summaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '8px',
  },
  discount: {
    color: '#22C55E',
  },
  totalLine: {
    borderTop: '1px solid #334155',
    paddingTop: '12px',
    marginTop: '8px',
    fontWeight: 'bold',
  },
  total: {
    fontSize: '18px',
    color: '#22C55E',
  },
  primaryButton: {
    padding: '14px',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  placeOrderButton: {
    padding: '16px',
    backgroundColor: '#22C55E',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  backButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94A3B8',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '8px',
  },
};

export default CheckoutFlow;