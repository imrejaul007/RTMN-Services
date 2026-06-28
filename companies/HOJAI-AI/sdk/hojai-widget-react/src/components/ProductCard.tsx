/**
 * ProductCard - Display a product with add-to-cart functionality
 */

import * as React from 'react';
import type { Product } from './types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  compact?: boolean;
  showRating?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
  compact = false,
  showRating = true,
  className = '',
}) => {
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock && product.inventory === 0) return;

    setAdding(true);
    try {
      await onAddToCart?.(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const isOutOfStock = !product.inStock || (product.inventory !== undefined && product.inventory <= 0);

  return (
    <div
      className={`hojai-product-card ${compact ? 'compact' : ''} ${className}`}
      onClick={() => onViewDetails?.(product)}
      style={styles.card}
    >
      {/* Image */}
      <div style={styles.imageContainer}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} style={styles.image} />
        ) : (
          <div style={styles.placeholder}>
            <span>📦</span>
          </div>
        )}

        {/* Badges */}
        {discount > 0 && (
          <span style={styles.discountBadge}>-{discount}%</span>
        )}
        {isOutOfStock && (
          <span style={styles.outOfStockBadge}>Out of Stock</span>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {product.category && (
          <span style={styles.category}>{product.category}</span>
        )}

        <h3 style={styles.name}>{product.name}</h3>

        {product.description && !compact && (
          <p style={styles.description}>{product.description.slice(0, 80)}...</p>
        )}

        {/* Rating */}
        {showRating && product.rating !== undefined && (
          <div style={styles.rating}>
            <span style={styles.stars}>★</span>
            <span>{product.rating.toFixed(1)}</span>
            {product.reviewCount !== undefined && (
              <span style={styles.reviewCount}>({product.reviewCount})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div style={styles.priceContainer}>
          <span style={styles.price}>
            {product.currency === 'INR' ? '₹' : '$'}{product.price.toLocaleString()}
          </span>
          {product.compareAtPrice && (
            <span style={styles.comparePrice}>
              {product.currency === 'INR' ? '₹' : '$'}{product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock indicator */}
        {product.inventory !== undefined && !isOutOfStock && product.inventory < 10 && (
          <span style={styles.lowStock}>Only {product.inventory} left</span>
        )}

        {/* Action */}
        {!compact && (
          <button
            style={{
              ...styles.addButton,
              ...(isOutOfStock ? styles.addButtonDisabled : {}),
              ...(added ? styles.addButtonSuccess : {}),
            }}
            onClick={handleAddToCart}
            disabled={isOutOfStock || adding}
          >
            {adding ? 'Adding...' : added ? '✓ Added!' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #334155',
    maxWidth: '280px',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: '1',
    backgroundColor: '#0F172A',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  discountBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    backgroundColor: '#EF4444',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: '#64748B',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  content: {
    padding: '12px',
  },
  category: {
    fontSize: '11px',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F1F5F9',
    margin: '4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  description: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: '4px 0 8px',
    lineHeight: 1.4,
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#F1F5F9',
    margin: '4px 0',
  },
  stars: {
    color: '#FBBF24',
  },
  reviewCount: {
    color: '#64748B',
    marginLeft: '4px',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '8px 0',
  },
  price: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#22C55E',
  },
  comparePrice: {
    fontSize: '14px',
    color: '#64748B',
    textDecoration: 'line-through',
  },
  lowStock: {
    fontSize: '11px',
    color: '#F59E0B',
    marginBottom: '8px',
  },
  addButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  addButtonDisabled: {
    backgroundColor: '#475569',
    cursor: 'not-allowed',
  },
  addButtonSuccess: {
    backgroundColor: '#22C55E',
  },
};

export default ProductCard;