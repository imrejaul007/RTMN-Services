/**
 * ProductCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  productId: 'prod_123',
  name: 'Test Product',
  description: 'A test product description',
  price: 999,
  compareAtPrice: 1299,
  currency: 'INR',
  category: 'Electronics',
  images: ['https://example.com/image.jpg'],
  inventory: 5,
  rating: 4.5,
  reviewCount: 120,
  inStock: true,
};

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeTruthy();
  });

  it('renders product price', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('₹999')).toBeTruthy();
  });

  it('shows discount percentage', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('-23%')).toBeTruthy();
  });

  it('renders category', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Electronics')).toBeTruthy();
  });

  it('shows out of stock when inventory is 0', () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0, inStock: false };
    render(<ProductCard product={outOfStockProduct} />);
    expect(screen.getByText('Out of Stock')).toBeTruthy();
  });

  it('calls onAddToCart when button clicked', async () => {
    const handleAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={handleAddToCart} />);

    const button = screen.getByText('Add to Cart');
    fireEvent.click(button);

    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('disables button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, inventory: 0, inStock: false };
    render(<ProductCard product={outOfStockProduct} />);

    const button = screen.getByText('Out of Stock');
    expect(button).toBeDisabled();
  });

  it('shows low stock warning when inventory is low', () => {
    const lowStockProduct = { ...mockProduct, inventory: 3 };
    render(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText('Only 3 left')).toBeTruthy();
  });

  it('renders rating stars', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('★')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('renders compact variant', () => {
    render(<ProductCard product={mockProduct} compact />);
    // Compact variant should not show add to cart button
    expect(screen.queryByText('Add to Cart')).toBeNull();
  });
});
