/**
 * CartDrawer - Slide-out shopping cart
 */

import * as React from 'react';
import type { Cart, CartItem } from './types';

interface CartDrawerProps {
  cart: Cart | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemoveItem?: (itemId: string) => void;
  onCheckout?: () => void;
  onApplyCoupon?: (code: string) => void;
  currency?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onApplyCoupon,
  currency = '₹',
}) => {
  const [couponInput, setCouponInput] = React.useState('');
  const [couponError, setCouponError] = React.useState('');

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    onApplyCoupon?.(couponInput);
    setCouponInput('');
  };

  const formatPrice = (price: number) => `${currency}${price.toLocaleString()}`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div style={styles.backdrop} onClick={onClose} />}

      {/* Drawer */}
      <div
        style={{
          ...styles.drawer,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            🛒 Your Cart
            {cart?.itemCount !== undefined && (
              <span style={styles.itemCount}>({cart.itemCount})</span>
            )}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {!cart || cart.items.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>🛒</span>
              <p style={styles.emptyText}>Your cart is empty</p>
              <p style={styles.emptySubtext}>Add some products to get started</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div style={styles.items}>
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.itemId}
                    item={item}
                    currency={currency}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                  />
                ))}
              </div>

              {/* Coupon */}
              <div style={styles.couponSection}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={styles.couponInput}
                />
                <button style={styles.couponButton} onClick={handleApplyCoupon}>
                  Apply
                </button>
              </div>
              {couponError && <p style={styles.couponError}>{couponError}</p>}
              {cart.couponCode && (
                <p style={styles.appliedCoupon}>
                  ✓ Coupon applied: {cart.couponCode}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 && (
              <div style={styles.summaryRow}>
                <span>Discount</span>
                <span style={styles.discount}>-{formatPrice(cart.discount)}</span>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span style={styles.totalLabel}>Total</span>
              <span style={styles.total}>{formatPrice(cart.total)}</span>
            </div>
            <button style={styles.checkoutButton} onClick={onCheckout}>
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
};

interface CartItemRowProps {
  item: CartItem;
  currency: string;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  currency,
  onUpdateQuantity,
  onRemove,
}) => {
  return (
    <div style={styles.itemRow}>
      {/* Image */}
      <div style={styles.itemImage}>
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <span>📦</span>
        )}
      </div>

      {/* Details */}
      <div style={styles.itemDetails}>
        <p style={styles.itemName}>{item.name}</p>
        <p style={styles.itemPrice}>
          {currency}{item.price.toLocaleString()}
        </p>
      </div>

      {/* Quantity controls */}
      <div style={styles.quantityControls}>
        <button
          style={styles.qtyButton}
          onClick={() => {
            if (item.quantity > 1) {
              onUpdateQuantity?.(item.itemId, item.quantity - 1);
            }
          }}
        >
          −
        </button>
        <span style={styles.qtyValue}>{item.quantity}</span>
        <button
          style={styles.qtyButton}
          onClick={() => onUpdateQuantity?.(item.itemId, item.quantity + 1)}
          disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
        >
          +
        </button>
      </div>

      {/* Remove */}
      <button
        style={styles.removeButton}
        onClick={() => onRemove?.(item.itemId)}
      >
        🗑️
      </button>

      {/* Item total */}
      <p style={styles.itemTotal}>
        {currency}{(item.price * item.quantity).toLocaleString()}
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '380px',
    maxWidth: '100%',
    height: '100vh',
    backgroundColor: '#0F172A',
    borderLeft: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemCount: {
    fontSize: '14px',
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    margin: '0 0 8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
  },
  items: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemRow: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr auto auto',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    position: 'relative',
  },
  itemImage: {
    width: '60px',
    height: '60px',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    minWidth: 0,
  },
  itemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F1F5F9',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemPrice: {
    fontSize: '13px',
    color: '#22C55E',
    margin: '4px 0 0',
  },
  itemTotal: {
    position: 'absolute',
    bottom: '8px',
    right: '12px',
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0,
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0F172A',
    borderRadius: '6px',
    padding: '4px',
  },
  qtyButton: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#334155',
    color: '#F1F5F9',
    fontSize: '16px',
    cursor: 'pointer',
  },
  qtyValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    minWidth: '24px',
    textAlign: 'center',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.6,
  },
  couponSection: {
    display: 'flex',
    gap: '8px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #334155',
  },
  couponInput: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '13px',
  },
  couponButton: {
    padding: '10px 16px',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  couponError: {
    color: '#EF4444',
    fontSize: '12px',
    margin: '8px 0 0',
  },
  appliedCoupon: {
    color: '#22C55E',
    fontSize: '12px',
    margin: '8px 0 0',
  },
  footer: {
    padding: '20px',
    borderTop: '1px solid #334155',
    backgroundColor: '#1E293B',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#94A3B8',
    marginBottom: '8px',
  },
  discount: {
    color: '#22C55E',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  total: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#22C55E',
  },
  checkoutButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#22C55E',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '16px',
  },
};

export default CartDrawer;