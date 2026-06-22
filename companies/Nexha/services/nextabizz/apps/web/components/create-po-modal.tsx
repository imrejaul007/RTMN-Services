'use client';

import { useState, useEffect } from 'react';
import type { Supplier, SupplierProduct, POItemInput, PaymentMethod, CreatePurchaseOrderInput } from '@nextabizz/shared-types';
import { fetchSuppliers, fetchCatalogProducts, createOrder } from '@/lib/api';
import { getSession } from '@/lib/supabase';
import { track } from '@/lib/intentCaptureService';

const APP_TYPE = 'nextabizz-web';

interface CreatePOModalProps {
  open: boolean;
  onClose: () => void;
  initialItems?: POItemInput[];
  source?: 'manual' | 'reorder' | 'rfq';
  rfqId?: string;
  onSuccess?: (orderId: string) => void;
}

interface LineItem extends POItemInput {
  id: string;
  product?: SupplierProduct;
  total?: number;
}

const STEPS = ['Supplier', 'Items', 'Delivery', 'Payment'] as const;
type Step = typeof STEPS[number];

const paymentMethods: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'prepaid', label: 'Prepaid', description: 'Pay in advance' },
  { value: 'net-terms', label: 'Net Terms', description: 'Pay within 15/30/45 days' },
  { value: 'bnpl', label: 'Buy Now Pay Later', description: 'Split payments with BNPL' },
];

export default function CreatePOModal({
  open,
  onClose,
  initialItems = [],
  source = 'manual',
  rfqId,
  onSuccess,
}: CreatePOModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('Supplier');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialItems.map((item, idx) => ({
      ...item,
      id: `item-${idx}`,
    }))
  );
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('prepaid');
  const [notes, setNotes] = useState('');

  // Credit info
  const [creditAvailability, setCreditAvailability] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadSuppliers();
      if (initialItems.length > 0) {
        setLineItems(initialItems.map((item, idx) => ({ ...item, id: `item-${idx}` })));
      }

      // Track checkout_start when the PO creation modal is opened
      const session = getSession();
      if (session?.merchantId) {
        const cartTotal = initialItems.reduce(
          (sum, item) => sum + (item.unitPrice ?? 0) * item.qty,
          0
        );
        track({
          userId: session.merchantId,
          event: 'checkout_start',
          appType: APP_TYPE,
          intentKey: `checkout-${session.merchantId}`,
          properties: {
            source,
            rfqId,
            itemCount: initialItems.length,
            totalValue: cartTotal,
          },
        });
      }
    }
  }, [open, initialItems, source, rfqId]);

  useEffect(() => {
    if (selectedSupplier) {
      loadProducts(selectedSupplier.id);
    }
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch {
      // Silently handle - will show empty state
    }
  };

  const loadProducts = async (supplierId: string) => {
    try {
      const result = await fetchCatalogProducts({ supplierId, pageSize: 50 });
      setProducts(result.items);
    } catch {
      setProducts([]);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.businessName.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addItem = (product?: SupplierProduct) => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      name: product?.name || '',
      sku: product?.sku,
      unit: product?.unit || 'units',
      unitPrice: product?.price || 0,
      qty: 1,
      supplierProductId: product?.id,
      product,
    };
    setLineItems([...lineItems, newItem]);
    setProductSearch('');
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(items =>
      items.map(item =>
        item.id === id
          ? {
              ...item,
              ...updates,
              total: updates.qty !== undefined
                ? (updates.qty * (updates.unitPrice ?? item.unitPrice))
                : updates.unitPrice !== undefined
                ? (updates.qty ?? item.qty) * updates.unitPrice
                : item.total,
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.total ?? item.qty * item.unitPrice), 0);

  const goToNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'Supplier':
        return !!selectedSupplier;
      case 'Items':
        return lineItems.length > 0 && lineItems.every(item => item.name && item.qty > 0);
      case 'Delivery':
        return !!(deliveryAddress.line1 && deliveryAddress.city && deliveryAddress.state && deliveryAddress.pincode);
      case 'Payment':
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    const session = getSession();
    if (!session) {
      setError('Please log in to create an order');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const orderData: CreatePurchaseOrderInput = {
        merchantId: session.merchantId,
        supplierId: selectedSupplier!.id,
        items: lineItems.map(({ id, product, ...item }) => item),
        paymentMethod,
        deliveryAddress,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
        notes: notes || undefined,
        source,
        rfqId,
      };

      const order = await createOrder(session.merchantId, orderData);

      // Track order_placed (highest-confidence intent signal)
      const orderTotal = lineItems.reduce(
        (sum, item) => sum + (item.total ?? item.qty * item.unitPrice),
        0
      );
      track({
        userId: session.merchantId,
        event: 'order_placed',
        appType: APP_TYPE,
        intentKey: order.id,
        properties: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          supplierId: selectedSupplier!.id,
          source,
          rfqId,
          paymentMethod,
          totalValue: orderTotal,
          itemCount: lineItems.length,
          items: lineItems.map(item => ({
            sku: item.sku,
            qty: item.qty,
            unitPrice: item.unitPrice,
          })),
        },
      });

      if (onSuccess) {
        onSuccess(order.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const currentStepIndex = STEPS.indexOf(currentStep);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Purchase Order</h2>
              <p className="text-sm text-gray-500 mt-1">
                Source: {source === 'reorder' ? 'Reorder Signal' : source === 'rfq' ? 'RFQ' : 'Manual'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-4">
            <div className="flex items-center">
              {STEPS.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                      ${index < currentStepIndex
                        ? 'bg-[#7C3AED] text-white'
                        : index === currentStepIndex
                        ? 'bg-[#7C3AED] text-white'
                        : 'bg-gray-100 text-gray-500'}
                    `}
                  >
                    {index < currentStepIndex ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${index <= currentStepIndex ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                    {step}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${index < currentStepIndex ? 'bg-[#7C3AED]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Supplier Selection */}
            {currentStep === 'Supplier' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Supplier
                  </label>
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-80 overflow-y-auto">
                  {filteredSuppliers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No suppliers found
                    </div>
                  ) : (
                    filteredSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        onClick={() => setSelectedSupplier(supplier)}
                        className={`
                          p-4 cursor-pointer transition-colors
                          ${selectedSupplier?.id === supplier.id
                            ? 'bg-[#7C3AED]/5 border-l-4 border-[#7C3AED]'
                            : 'hover:bg-gray-50'}
                        `}
                      >
                        <p className="font-medium text-gray-900">{supplier.businessName}</p>
                        {supplier.categories.length > 0 && (
                          <p className="text-sm text-gray-500">{supplier.categories.join(', ')}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Items */}
            {currentStep === 'Items' && (
              <div className="space-y-4">
                {selectedSupplier && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">
                      Supplier: {selectedSupplier.businessName}
                    </p>
                  </div>
                )}

                {/* Add Product Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add from Catalog
                  </label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-40 overflow-y-auto">
                      {filteredProducts.slice(0, 5).map(product => (
                        <div
                          key={product.id}
                          onClick={() => {
                            addItem(product);
                            setProductSearch('');
                          }}
                          className="p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                          </div>
                          <p className="text-sm font-medium text-[#7C3AED]">
                            ₹{product.price}/{product.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Free Text Add */}
                <button
                  type="button"
                  onClick={() => addItem()}
                  className="text-sm text-[#7C3AED] hover:text-[#6D28D9] font-medium"
                >
                  + Add custom item
                </button>

                {/* Line Items */}
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {lineItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No items added yet
                    </div>
                  ) : (
                    lineItems.map((item, index) => (
                      <div key={item.id} className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-4">
                            <label className="block text-xs text-gray-500 mb-1">Item Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => updateItem(item.id, { name: e.target.value })}
                              placeholder="Item name"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={e => updateItem(item.id, { qty: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => updateItem(item.id, { unit: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-xs text-gray-500 mb-1">Total</label>
                            <div className="px-3 py-2 text-sm font-medium bg-gray-50 rounded-lg">
                              ₹{(item.total ?? item.qty * item.unitPrice).toFixed(2)}
                            </div>
                          </div>
                          <div className="col-span-1 flex items-end justify-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal */}
                {lineItems.length > 0 && (
                  <div className="flex justify-end">
                    <div className="bg-gray-50 rounded-lg px-6 py-3">
                      <span className="text-gray-600 mr-4">Subtotal:</span>
                      <span className="text-xl font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Delivery */}
            {currentStep === 'Delivery' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.line1}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                    placeholder="Building/Street"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.line2}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, line2: e.target.value })}
                    placeholder="Landmark/Area (optional)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.city}
                      onChange={e => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.state}
                      onChange={e => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.pincode}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={e => setExpectedDelivery(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {currentStep === 'Payment' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method
                  </label>
                  <div className="space-y-3">
                    {paymentMethods.map(method => (
                      <div
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`
                          p-4 border-2 rounded-xl cursor-pointer transition-all
                          ${paymentMethod === method.value
                            ? 'border-[#7C3AED] bg-[#7C3AED]/5'
                            : 'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        <div className="flex items-center">
                          <div
                            className={`
                              w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3
                              ${paymentMethod === method.value
                                ? 'border-[#7C3AED]'
                                : 'border-gray-300'}
                            `}
                          >
                            {paymentMethod === method.value && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{method.label}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'bnpl' && creditAvailability !== null && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm text-green-800">
                      Available BNPL Credit: <span className="font-bold">₹{creditAvailability.toLocaleString('en-IN')}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Supplier</span>
                      <span className="font-medium">{selectedSupplier?.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items</span>
                      <span className="font-medium">{lineItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment</span>
                      <span className="font-medium">
                        {paymentMethods.find(m => m.value === paymentMethod)?.label}
                      </span>
                    </div>
                    {expectedDelivery && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Delivery</span>
                        <span className="font-medium">
                          {new Date(expectedDelivery).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-[#7C3AED]">
                        ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={currentStepIndex > 0 ? goToPrevStep : onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {currentStepIndex > 0 ? 'Back' : 'Cancel'}
            </button>

            {currentStepIndex < STEPS.length - 1 ? (
              <button
                onClick={goToNextStep}
                disabled={!canProceed()}
                className={`
                  px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors
                  ${canProceed()
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                    : 'bg-gray-300 cursor-not-allowed'}
                `}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !canProceed()}
                className={`
                  px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors
                  ${isLoading || !canProceed()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#7C3AED] hover:bg-[#6D28D9]'}
                `}
              >
                {isLoading ? 'Creating...' : 'Create Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
