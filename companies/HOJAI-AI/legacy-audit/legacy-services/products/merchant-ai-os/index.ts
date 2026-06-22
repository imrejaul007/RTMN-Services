/**
 * Hojai Merchant AI OS
 *
 * Product Layer on top of Hojai Core Platforms
 *
 * Modules:
 * - Customers (Data Platform + Identity)
 * - Orders (Data Platform)
 * - Products (Data Platform)
 * - AI Employees (Agents Platform)
 * - Workflows (Workflows Platform)
 * - Dashboard (Analytics Platform)
 */

import { createLogger } from '../../hojai-core/shared/utils/logger';

const logger = createLogger('merchant-ai-os');

// ============================================
// CUSTOMERS MODULE
// ============================================

export interface CustomerModule {
  list(params: CustomerListParams): Promise<Customer[]>;
  get(id: string): Promise<Customer | null>;
  create(data: CustomerCreateData): Promise<Customer>;
  update(id: string, data: CustomerUpdateData): Promise<Customer | null>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<Customer[]>;
  getSegments(id: string): Promise<Segment[]>;
  getTimeline(id: string): Promise<TimelineEvent[]>;
}

export interface Customer {
  id: string;
  merchant_id: string;
  name: string;
  phone: string;
  email?: string;
  lifetime_value: number;
  order_count: number;
  churn_risk: 'low' | 'medium' | 'high';
  engagement_score: number;
  segments: string[];
  last_order_date?: string;
  created_at: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  status?: string;
  segment?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CustomerCreateData {
  name: string;
  phone: string;
  email?: string;
}

export interface CustomerUpdateData {
  name?: string;
  email?: string;
  tags?: string[];
}

export interface Segment {
  id: string;
  name: string;
  customer_count: number;
  description?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
}

class CustomersModule implements CustomerModule {
  private customers: Map<string, Customer> = new Map();

  async list(params: CustomerListParams): Promise<Customer[]> {
    const all = Array.from(this.customers.values());
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    return all.slice(start, start + limit);
  }

  async get(id: string): Promise<Customer | null> {
    return this.customers.get(id) || null;
  }

  async create(data: CustomerCreateData): Promise<Customer> {
    const customer: Customer = {
      id: `cust_${Date.now()}`,
      merchant_id: 'merchant_1',
      name: data.name,
      phone: data.phone,
      email: data.email,
      lifetime_value: 0,
      order_count: 0,
      churn_risk: 'low',
      engagement_score: 50,
      segments: [],
      created_at: new Date().toISOString()
    };
    this.customers.set(customer.id, customer);
    logger.info('customer_created', { customerId: customer.id });
    return customer;
  }

  async update(id: string, data: CustomerUpdateData): Promise<Customer | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;
    Object.assign(customer, data);
    return customer;
  }

  async delete(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  async search(query: string): Promise<Customer[]> {
    const lower = query.toLowerCase();
    return Array.from(this.customers.values()).filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.phone.includes(query) ||
      c.email?.toLowerCase().includes(lower)
    );
  }

  async getSegments(id: string): Promise<Segment[]> {
    return [
      { id: 'seg_1', name: 'VIP', customer_count: 50, description: 'High value customers' },
      { id: 'seg_2', name: 'Active', customer_count: 200, description: 'Active last 30 days' },
    ];
  }

  async getTimeline(id: string): Promise<TimelineEvent[]> {
    return [
      { id: '1', type: 'order', title: 'Order #1234', timestamp: new Date().toISOString() },
      { id: '2', type: 'support', title: 'Ticket #567', timestamp: new Date().toISOString() },
    ];
  }
}

// ============================================
// ORDERS MODULE
// ============================================

export interface OrderModule {
  list(params: OrderListParams): Promise<Order[]>;
  get(id: string): Promise<Order | null>;
  create(data: OrderCreateData): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  getByCustomer(customerId: string): Promise<Order[]>;
  getStats(merchantId: string): Promise<OrderStats>;
}

export interface Order {
  id: string;
  merchant_id: string;
  customer_id: string;
  order_number: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  customer_id?: string;
}

export interface OrderCreateData {
  customer_id: string;
  items: Omit<OrderItem, 'total'>[];
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  pending_orders: number;
}

class OrdersModule implements OrderModule {
  private orders: Map<string, Order> = new Map();

  async list(params: OrderListParams): Promise<Order[]> {
    const all = Array.from(this.orders.values());
    let filtered = all;

    if (params.status) {
      filtered = filtered.filter(o => o.status === params.status);
    }
    if (params.customer_id) {
      filtered = filtered.filter(o => o.customer_id === params.customer_id);
    }

    return filtered.slice(0, params.limit || 20);
  }

  async get(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async create(data: OrderCreateData): Promise<Order> {
    const items: OrderItem[] = data.items.map(item => ({
      ...item,
      total: item.price * item.quantity
    }));
    const total = items.reduce((sum, item) => sum + item.total, 0);

    const order: Order = {
      id: `ord_${Date.now()}`,
      merchant_id: 'merchant_1',
      customer_id: data.customer_id,
      order_number: `ORD${Date.now()}`,
      items,
      total,
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    };

    this.orders.set(order.id, order);
    logger.info('order_created', { orderId: order.id, total: order.total });
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = status;
    return order;
  }

  async getByCustomer(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(o => o.customer_id === customerId);
  }

  async getStats(merchantId: string): Promise<OrderStats> {
    const orders = Array.from(this.orders.values());
    const total = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      total_orders: orders.length,
      total_revenue: total,
      avg_order_value: orders.length > 0 ? total / orders.length : 0,
      pending_orders: orders.filter(o => o.status === 'pending').length
    };
  }
}

// ============================================
// PRODUCTS MODULE
// ============================================

export interface ProductModule {
  list(params?: ProductListParams): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  create(data: ProductCreateData): Promise<Product>;
  update(id: string, data: ProductUpdateData): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<Product[]>;
  getByCategory(category: string): Promise<Product[]>;
}

export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  mrp?: number;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  images?: string[];
  created_at: string;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: Product['status'];
}

export interface ProductCreateData {
  name: string;
  category: string;
  price: number;
  mrp?: number;
  stock?: number;
  description?: string;
  images?: string[];
}

export interface ProductUpdateData {
  name?: string;
  description?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  status?: Product['status'];
}

class ProductsModule implements ProductModule {
  private products: Map<string, Product> = new Map();

  async list(params?: ProductListParams): Promise<Product[]> {
    let all = Array.from(this.products.values());
    if (params?.category) {
      all = all.filter(p => p.category === params.category);
    }
    return all.slice(0, params?.limit || 50);
  }

  async get(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async create(data: ProductCreateData): Promise<Product> {
    const product: Product = {
      id: `prod_${Date.now()}`,
      merchant_id: 'merchant_1',
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      mrp: data.mrp,
      stock: data.stock || 0,
      status: data.stock === 0 ? 'out_of_stock' : 'active',
      images: data.images,
      created_at: new Date().toISOString()
    };
    this.products.set(product.id, product);
    return product;
  }

  async update(id: string, data: ProductUpdateData): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) return null;
    Object.assign(product, data);
    if (data.stock === 0) product.status = 'out_of_stock';
    return product;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async search(query: string): Promise<Product[]> {
    const lower = query.toLowerCase();
    return Array.from(this.products.values()).filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description?.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower)
    );
  }

  async getByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.category === category);
  }
}

// ============================================
// AI EMPLOYEES MODULE
// ============================================

export interface AgentModule {
  list(): Promise<AIEmployee[]>;
  get(id: string): Promise<AIEmployee | null>;
  create(data: AgentCreateData): Promise<AIEmployee>;
  update(id: string, data: AgentUpdateData): Promise<AIEmployee | null>;
  invoke(id: string, message: string, context?: Record<string, unknown>): Promise<AgentResponse>;
  getStats(id: string): Promise<AgentStats>;
}

export interface AIEmployee {
  id: string;
  merchant_id: string;
  name: string;
  type: 'support' | 'sales' | 'ordering' | 'marketing';
  status: 'active' | 'inactive' | 'training';
  conversations_handled: number;
  avg_response_time_seconds: number;
  csat_score?: number;
  created_at: string;
}

export interface AgentCreateData {
  name: string;
  type: 'support' | 'sales' | 'ordering' | 'marketing';
  greeting?: string;
  instructions?: string;
}

export interface AgentUpdateData {
  name?: string;
  status?: 'active' | 'inactive' | 'training';
  instructions?: string;
}

export interface AgentResponse {
  message: string;
  conversation_id: string;
  escalated: boolean;
  confidence: number;
}

export interface AgentStats {
  total_conversations: number;
  resolved: number;
  escalated: number;
  avg_response_time: number;
  csat?: number;
}

class AgentsModule implements AgentModule {
  private agents: Map<string, AIEmployee> = new Map();

  async list(): Promise<AIEmployee[]> {
    return Array.from(this.agents.values());
  }

  async get(id: string): Promise<AIEmployee | null> {
    return this.agents.get(id) || null;
  }

  async create(data: AgentCreateData): Promise<AIEmployee> {
    const agent: AIEmployee = {
      id: `agent_${Date.now()}`,
      merchant_id: 'merchant_1',
      name: data.name,
      type: data.type,
      status: 'inactive',
      conversations_handled: 0,
      avg_response_time_seconds: 0,
      created_at: new Date().toISOString()
    };
    this.agents.set(agent.id, agent);
    logger.info('agent_created', { agentId: agent.id, type: agent.type });
    return agent;
  }

  async update(id: string, data: AgentUpdateData): Promise<AIEmployee | null> {
    const agent = this.agents.get(id);
    if (!agent) return null;
    Object.assign(agent, data);
    return agent;
  }

  async invoke(id: string, message: string, context?: Record<string, unknown>): Promise<AgentResponse> {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    if (agent.status !== 'active') throw new Error('Agent not active');

    agent.conversations_handled++;

    return {
      message: `Response from ${agent.name} to: "${message}"`,
      conversation_id: `conv_${Date.now()}`,
      escalated: false,
      confidence: 0.85
    };
  }

  async getStats(id: string): Promise<AgentStats> {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');

    return {
      total_conversations: agent.conversations_handled,
      resolved: Math.floor(agent.conversations_handled * 0.8),
      escalated: Math.floor(agent.conversations_handled * 0.1),
      avg_response_time: agent.avg_response_time_seconds,
      csat: agent.csat_score
    };
  }
}

// ============================================
// WORKFLOWS MODULE
// ============================================

export interface WorkflowModule {
  list(): Promise<Workflow[]>;
  get(id: string): Promise<Workflow | null>;
  create(data: WorkflowCreateData): Promise<Workflow>;
  execute(id: string, context?: Record<string, unknown>): Promise<WorkflowRun>;
  getRuns(workflowId: string): Promise<WorkflowRun[]>;
}

export interface Workflow {
  id: string;
  merchant_id: string;
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'draft';
  runs_count: number;
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  type: 'message' | 'delay' | 'condition' | 'action';
  config: Record<string, unknown>;
}

export interface WorkflowCreateData {
  name: string;
  trigger: string;
  steps: WorkflowStep[];
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
}

class WorkflowsModule implements WorkflowModule {
  private workflows: Map<string, Workflow> = new Map();
  private runs: Map<string, WorkflowRun[]> = new Map();

  async list(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async get(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async create(data: WorkflowCreateData): Promise<Workflow> {
    const workflow: Workflow = {
      id: `wf_${Date.now()}`,
      merchant_id: 'merchant_1',
      name: data.name,
      trigger: data.trigger,
      steps: data.steps.map((s, i) => ({ ...s, id: `step_${i}` })),
      status: 'draft',
      runs_count: 0,
      created_at: new Date().toISOString()
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async execute(id: string, context?: Record<string, unknown>): Promise<WorkflowRun> {
    const workflow = this.workflows.get(id);
    if (!workflow) throw new Error('Workflow not found');

    workflow.runs_count++;
    const run: WorkflowRun = {
      id: `run_${Date.now()}`,
      workflow_id: id,
      status: 'running',
      started_at: new Date().toISOString()
    };

    const runs = this.runs.get(id) || [];
    runs.push(run);
    this.runs.set(id, runs);

    setTimeout(() => {
      run.status = 'completed';
      run.completed_at = new Date().toISOString();
    }, 1000);

    return run;
  }

  async getRuns(workflowId: string): Promise<WorkflowRun[]> {
    return this.runs.get(workflowId) || [];
  }
}

// ============================================
// ANALYTICS MODULE
// ============================================

export interface AnalyticsModule {
  getDashboard(merchantId: string): Promise<Dashboard>;
  getRevenue(merchantId: string, period: Period): Promise<RevenueData[]>;
  getCustomers(merchantId: string): Promise<CustomerStats>;
  getOrders(merchantId: string, period: Period): Promise<OrderStats>;
  getTopProducts(merchantId: string, limit?: number): Promise<TopProduct[]>;
}

export interface Dashboard {
  revenue: number;
  orders: number;
  customers: number;
  avg_order_value: number;
  period: string;
}

export interface Period {
  start: string;
  end: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CustomerStats {
  total: number;
  new: number;
  returning: number;
  at_risk: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

class AnalyticsModule {
  async getDashboard(merchantId: string): Promise<Dashboard> {
    return {
      revenue: 125000,
      orders: 450,
      customers: 280,
      avg_order_value: 278,
      period: '30d'
    };
  }

  async getRevenue(merchantId: string, period: Period): Promise<RevenueData[]> {
    const days = 7;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      revenue: Math.random() * 10000 + 5000,
      orders: Math.floor(Math.random() * 50) + 20
    }));
  }

  async getCustomers(merchantId: string): Promise<CustomerStats> {
    return {
      total: 280,
      new: 45,
      returning: 235,
      at_risk: 23
    };
  }

  async getOrders(merchantId: string, period: Period): Promise<OrderStats> {
    return {
      total_orders: 450,
      total_revenue: 125000,
      avg_order_value: 278,
      pending_orders: 12
    };
  }

  async getTopProducts(merchantId: string, limit = 5): Promise<TopProduct[]> {
    return [
      { id: '1', name: 'Product A', quantity: 120, revenue: 24000 },
      { id: '2', name: 'Product B', quantity: 95, revenue: 19000 },
      { id: '3', name: 'Product C', quantity: 80, revenue: 16000 },
    ].slice(0, limit);
  }
}

// ============================================
// MAIN EXPORTS
// ============================================

export class MerchantAIOS {
  customers: CustomersModule;
  orders: OrdersModule;
  products: ProductsModule;
  agents: AgentsModule;
  workflows: WorkflowsModule;
  analytics: AnalyticsModule;

  constructor() {
    this.customers = new CustomersModule();
    this.orders = new OrdersModule();
    this.products = new ProductsModule();
    this.agents = new AgentsModule();
    this.workflows = new WorkflowsModule();
    this.analytics = new AnalyticsModule();
    logger.info('merchant_ai_os_initialized');
  }
}

export default MerchantAIOS;
