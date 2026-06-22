'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupplierProduct } from '@nextabizz/shared-types';
import CreatePOModal from '@/components/create-po-modal';
import { track } from '@/lib/intentCaptureService';
import { getSession } from '@/lib/supabase';

const APP_TYPE = 'nextabizz-web';

type SortOption = 'price_asc' | 'price_desc' | 'moq' | 'delivery_days';

// Extended types for UI (matching shared-types with UI additions)
interface CatalogProduct {
  id: string;
  supplierId: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  moq: number;
  price: number;
  deliveryDays?: number;
  categoryId?: string;
  images?: string[];
  isActive: boolean;
  unitPrice: number;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CatalogCategory {
  id: string;
  name: string;
  productCount: number;
}

// Mock data - using proper field names
const mockProducts: CatalogProduct[] = [
  {
    id: 'prod-1',
    supplierId: 'sup-1',
    name: 'Basmati Rice - Premium Long Grain',
    sku: 'RICE-001',
    description: 'Premium quality aged basmati rice, perfect for biryanis and pulao',
    unit: 'kg',
    moq: 10,
    price: 120,
    unitPrice: 120,
    deliveryDays: 3,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-2',
    supplierId: 'sup-1',
    name: 'Refined Sunflower Oil',
    sku: 'OIL-002',
    description: 'Pure refined sunflower oil for cooking',
    unit: 'liter',
    moq: 5,
    price: 180,
    unitPrice: 180,
    deliveryDays: 2,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-3',
    supplierId: 'sup-2',
    name: 'Tur Dal (Arhar)',
    sku: 'DAL-001',
    description: 'Fresh quality tur dal, cleaned and sorted',
    unit: 'kg',
    moq: 5,
    price: 165,
    unitPrice: 165,
    deliveryDays: 3,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-4',
    supplierId: 'sup-2',
    name: 'Chana Dal',
    sku: 'DAL-002',
    description: 'Premium quality chana dal',
    unit: 'kg',
    moq: 5,
    price: 95,
    unitPrice: 95,
    deliveryDays: 3,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-5',
    supplierId: 'sup-3',
    name: 'Turmeric Powder - Haldi',
    sku: 'SPICE-001',
    description: 'Pure and natural turmeric powder',
    unit: 'kg',
    moq: 2,
    price: 280,
    unitPrice: 280,
    deliveryDays: 4,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-6',
    supplierId: 'sup-3',
    name: 'Red Chilli Powder',
    sku: 'SPICE-002',
    description: 'Hot and flavorful red chilli powder',
    unit: 'kg',
    moq: 2,
    price: 320,
    unitPrice: 320,
    deliveryDays: 4,
    isActive: true,
    inStock: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-7',
    supplierId: 'sup-1',
    name: 'Besan (Gram Flour)',
    sku: 'FLOUR-001',
    description: 'Fine quality besan for pakoras and sweets',
    unit: 'kg',
    moq: 5,
    price: 85,
    unitPrice: 85,
    deliveryDays: 2,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prod-8',
    supplierId: 'sup-2',
    name: 'Sugar',
    sku: 'SUGAR-001',
    description: 'Refined white sugar',
    unit: 'kg',
    moq: 20,
    price: 45,
    unitPrice: 45,
    deliveryDays: 2,
    isActive: true,
    inStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCategories: CatalogCategory[] = [
  { id: 'cat-1', name: 'Grains & Rice', productCount: 12 },
  { id: 'cat-2', name: 'Oils & Ghee', productCount: 8 },
  { id: 'cat-3', name: 'Pulses & Legumes', productCount: 15 },
  { id: 'cat-4', name: 'Spices & Masalas', productCount: 25 },
  { id: 'cat-5', name: 'Flours & Grains', productCount: 10 },
  { id: 'cat-6', name: 'Sugar & Sweeteners', productCount: 6 },
];

const mockSuppliers: Record<string, string> = {
  'sup-1': 'Fresh Foods Distributors',
  'sup-2': 'Premium Spices Co.',
  'sup-3': 'Quality Provisions Ltd.',
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'moq', label: 'MOQ (Low to High)' },
  { value: 'delivery_days', label: 'Delivery Time' },
];

export default function CatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [showCategorySidebar, setShowCategorySidebar] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 12;

  // Cart/PO
  const [cartItems, setCartItems] = useState<Array<{ product: CatalogProduct; qty: number }>>([]);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      let filtered = [...mockProducts];

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (selectedCategory) {
        filtered = filtered.filter(p => p.categoryId === selectedCategory);
      }

      // Sort
      switch (sortBy) {
        case 'price_asc':
          filtered.sort((a, b) => a.unitPrice - b.unitPrice);
          break;
        case 'price_desc':
          filtered.sort((a, b) => b.unitPrice - a.unitPrice);
          break;
        case 'moq':
          filtered.sort((a, b) => a.moq - b.moq);
          break;
        case 'delivery_days':
          filtered.sort((a, b) => (a.deliveryDays ?? 999) - (b.deliveryDays ?? 999));
          break;
      }

      // Paginate
      const start = 0;
      const end = page * pageSize;
      const paginatedProducts = filtered.slice(start, end);

      setProducts(paginatedProducts);
      setHasMore(filtered.length > end);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy, page]);

  useEffect(() => {
    fetchProducts();
    setCategories(mockCategories);
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  // Track product search intent (debounced to avoid duplicate events on rapid typing)
  const lastSearchRef = useRef('');
  useEffect(() => {
    if (!searchQuery || searchQuery === lastSearchRef.current) return;
    lastSearchRef.current = searchQuery;

    const session = getSession();
    if (!session?.merchantId) return;

    const timer = setTimeout(() => {
      track({
        userId: session.merchantId,
        event: 'product_search',
        appType: APP_TYPE,
        intentKey: searchQuery.trim().toLowerCase(),
        properties: {
          query: searchQuery,
          category: selectedCategory ?? 'all',
          sortBy,
        },
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy]);

  const handleAddToCart = (product: CatalogProduct) => {
    // Track product view intent before adding to cart
    const session = getSession();
    if (session?.merchantId) {
      track({
        userId: session.merchantId,
        event: 'product_view',
        appType: APP_TYPE,
        intentKey: product.id,
        properties: {
          productId: product.id,
          sku: product.sku,
          supplierId: product.supplierId,
          price: product.unitPrice,
          unit: product.unit,
          moq: product.moq,
        },
      });
    }

    const existing = cartItems.find(item => item.product.id === product.id);
    if (existing) {
      setCartItems(items =>
        items.map(item =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + product.moq }
            : item
        )
      );
    } else {
      setCartItems(items => [...items, { product, qty: product.moq }]);
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(items => items.filter(item => item.product.id !== productId));
  };

  const handleCreatePO = () => {
    // Track checkout_start when buyer initiates PO creation
    const session = getSession();
    if (session?.merchantId) {
      const totalValue = cartItems.reduce(
        (sum, item) => sum + item.product.unitPrice * item.qty,
        0
      );
      track({
        userId: session.merchantId,
        event: 'checkout_start',
        appType: APP_TYPE,
        intentKey: `cart-${session.merchantId}`,
        properties: {
          itemCount: cartItems.length,
          totalValue,
          items: cartItems.map(item => ({
            productId: item.product.id,
            sku: item.product.sku,
            qty: item.qty,
            unitPrice: item.product.unitPrice,
          })),
          source: 'catalog-cart',
        },
      });
    }
    setIsCreatePOModalOpen(true);
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.unitPrice * item.qty, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Catalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse products from verified suppliers
        </p>
      </div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        {showCategorySidebar && (
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${!selectedCategory
                      ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-medium'
                      : 'text-gray-600 hover:bg-gray-100'}
                  `}
                >
                  All Products
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                      ${selectedCategory === category.name
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-medium'
                        : 'text-gray-600 hover:bg-gray-100'}
                    `}
                  >
                    <span>{category.name}</span>
                    <span className="text-xs text-gray-400">{category.productCount}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Search and Sort */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, SKU..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                />
              </div>
              <div className="w-48">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowCategorySidebar(!showCategorySidebar)}
                className="lg:hidden px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 font-medium">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mt-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Product Image Placeholder */}
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      {product.inStock ? (
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Out of Stock</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{mockSuppliers[product.supplierId]}</p>
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      {product.sku && (
                        <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>
                      )}

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-lg font-bold text-[#7C3AED]">
                          ₹{product.unitPrice}
                        </span>
                        <span className="text-xs text-gray-500">/{product.unit}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span>MOQ: {product.moq} {product.unit}</span>
                        <span>{product.deliveryDays} days</span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.inStock}
                        className={`
                          w-full py-2 rounded-lg text-sm font-medium transition-colors
                          ${product.inStock
                            ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        `}
                      >
                        {product.inStock ? 'Add to PO' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Cart ({cartItems.length})</h3>
            <button
              onClick={() => setCartItems([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {cartItems.map(item => (
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.qty} x ₹{item.product.unitPrice}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.product.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-bold text-gray-900">₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={handleCreatePO}
              className="w-full py-2.5 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Create PO
            </button>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      <CreatePOModal
        open={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        source="manual"
        initialItems={cartItems.map(item => ({
          name: item.product.name,
          sku: item.product.sku,
          qty: item.qty,
          unit: item.product.unit,
          unitPrice: item.product.unitPrice,
        }))}
        onSuccess={() => {
          setCartItems([]);
          setIsCreatePOModalOpen(false);
        }}
      />
    </div>
  );
}
