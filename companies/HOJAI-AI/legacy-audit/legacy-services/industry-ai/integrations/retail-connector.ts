/**
 * HOJAI Retail AI - REZ-Merchant Connector
 */

export interface RetailConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface Sale {
  id: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi';
}

export class RetailConnector {
  private config: RetailConnectorConfig;

  constructor(config: RetailConnectorConfig) {
    this.config = config;
  }

  /**
   * Get products
   */
  async getProducts(storeId: string): Promise<Product[]> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/retail/${storeId}/products`, {
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return this.getLocalProducts(storeId);
  }

  /**
   * Create sale
   */
  async createSale(storeId: string, data: {
    items: { productId: string; quantity: number }[];
    paymentMethod: 'cash' | 'card' | 'upi';
  }): Promise<Sale> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/retail/${storeId}/sales`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    }
    return this.createLocalSale(storeId, data);
  }

  /**
   * Process return
   */
  async processReturn(saleId: string, items: { productId: string; quantity: number }[]): Promise<{ refund: number }> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/retail/returns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ saleId, items }),
      });
      return response.json();
    }
    return { refund: 0 };
  }

  // Local mock data
  private mockProducts: Product[] = [
    { id: 'prod-001', name: 'T-Shirt (Blue, M)', sku: 'TSH-BLU-M', price: 599, stock: 45 },
    { id: 'prod-002', name: 'T-Shirt (Black, L)', sku: 'TSH-BLK-L', price: 649, stock: 32 },
    { id: 'prod-003', name: 'Jeans (Navy, 32)', sku: 'JNS-NVY-32', price: 1299, stock: 18 },
    { id: 'prod-004', name: 'Casual Shoes (Brown, 9)', sku: 'SHO-BRN-9', price: 2499, stock: 12 },
    { id: 'prod-005', name: 'Sunglasses (Black)', sku: 'SUN-BLK-01', price: 899, stock: 25 },
    { id: 'prod-006', name: 'Backpack (Grey, 25L)', sku: 'BAG-GRY-25', price: 1599, stock: 8 },
  ];

  private mockSales: Sale[] = [
    { id: 'sale-001', items: [{ productId: 'prod-001', quantity: 2, price: 599 }], total: 1198, paymentMethod: 'upi' },
    { id: 'sale-002', items: [{ productId: 'prod-003', quantity: 1, price: 1299 }], total: 1299, paymentMethod: 'card' },
  ];

  // Local methods
  private async getLocalProducts(storeId: string): Promise<Product[]> {
    return this.mockProducts;
  }

  private async createLocalSale(storeId: string, data: { items: { productId: string; quantity: number }[]; paymentMethod: 'cash' | 'card' | 'upi' }): Promise<Sale> {
    let total = 0;
    const saleItems = data.items.map(item => {
      const product = this.mockProducts.find(p => p.id === item.productId);
      const price = product?.price || 0;
      total += price * item.quantity;
      return { productId: item.productId, quantity: item.quantity, price };
    });

    const sale: Sale = {
      id: `local-sale-${Date.now()}`,
      items: saleItems,
      total,
      paymentMethod: data.paymentMethod,
    };
    this.mockSales.push(sale);
    return sale;
  }
}
