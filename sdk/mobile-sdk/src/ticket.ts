/**
 * RTMN Mobile SDK - Ticket API
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'eventemitter3';
import {
  Ticket,
  TicketInput,
  TicketFilters,
  Comment,
  TicketStatus,
  ApiResponse,
} from './types';

export class TicketAPI extends EventEmitter {
  private client: AxiosInstance;
  private realtimeClient: EventEmitter | null = null;

  constructor(baseUrl: string) {
    super();
    this.client = axios.create({
      baseURL: `${baseUrl}/api/tickets`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set realtime event emitter for live updates
   */
  setRealtimeClient(emitter: EventEmitter): void {
    this.realtimeClient = emitter;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Create a new support ticket
   */
  async create(input: TicketInput): Promise<Ticket> {
    try {
      const formData = new FormData();
      formData.append('title', input.title);
      formData.append('description', input.description);
      if (input.priority) formData.append('priority', input.priority);
      if (input.category) formData.append('category', input.category);
      if (input.tags) {
        input.tags.forEach((tag) => formData.append('tags[]', tag));
      }
      if (input.attachments) {
        input.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await this.client.post<ApiResponse<Ticket>>('/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data) {
        this.emit('created', response.data.data);
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to create ticket');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get all tickets with optional filters
   */
  async getAll(filters?: TicketFilters): Promise<Ticket[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) {
        filters.status.forEach((s) => params.append('status[]', s));
      }
      if (filters?.priority) {
        filters.priority.forEach((p) => params.append('priority[]', p));
      }
      if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.append('dateTo', filters.dateTo);
      if (filters?.search) params.append('search', filters.search);

      const response = await this.client.get<ApiResponse<Ticket[]>>(
        `/?${params.toString()}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch tickets');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get single ticket by ID
   */
  async getById(id: string): Promise<Ticket> {
    try {
      const response = await this.client.get<ApiResponse<Ticket>>(`/${id}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Ticket not found');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update ticket
   */
  async update(id: string, data: Partial<Ticket>): Promise<Ticket> {
    try {
      const response = await this.client.patch<ApiResponse<Ticket>>(
        `/${id}`,
        data
      );

      if (response.data.success && response.data.data) {
        const ticket = response.data.data;
        this.emit('updated', ticket);
        this.realtimeClient?.emit('ticket:updated', ticket);
        return ticket;
      }
      throw new Error(response.data.error?.message || 'Failed to update ticket');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    return this.update(id, { status });
  }

  /**
   * Add comment to ticket
   */
  async addComment(id: string, content: string, isInternal: boolean = false): Promise<Comment> {
    try {
      const response = await this.client.post<ApiResponse<Comment>>(
        `/${id}/comments`,
        { content, isInternal }
      );

      if (response.data.success && response.data.data) {
        const comment = response.data.data;
        this.emit('commentAdded', { ticketId: id, comment });
        return comment;
      }
      throw new Error(response.data.error?.message || 'Failed to add comment');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get ticket comments
   */
  async getComments(id: string): Promise<Comment[]> {
    try {
      const response = await this.client.get<ApiResponse<Comment[]>>(
        `/${id}/comments`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch comments');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Subscribe to ticket updates (realtime)
   */
  onUpdate(callback: (ticket: Ticket) => void): () => void {
    const handler = (ticket: Ticket) => callback(ticket);
    this.realtimeClient?.on('ticket:updated', handler);
    return () => this.realtimeClient?.off('ticket:updated', handler);
  }

  /**
   * Subscribe to new ticket notifications
   */
  onNewTicket(callback: (ticket: Ticket) => void): () => void {
    const handler = (ticket: Ticket) => callback(ticket);
    this.realtimeClient?.on('ticket:created', handler);
    return () => this.realtimeClient?.off('ticket:created', handler);
  }

  /**
   * Subscribe to comment notifications
   */
  onComment(callback: (data: { ticketId: string; comment: Comment }) => void): () => void {
    const handler = (data: { ticketId: string; comment: Comment }) => callback(data);
    this.realtimeClient?.on('ticket:commentAdded', handler);
    return () => this.realtimeClient?.off('ticket:commentAdded', handler);
  }

  /**
   * Close ticket
   */
  async close(id: string): Promise<Ticket> {
    return this.updateStatus(id, 'closed');
  }

  /**
   * Reopen closed ticket
   */
  async reopen(id: string): Promise<Ticket> {
    return this.updateStatus(id, 'open');
  }

  /**
   * Get ticket statistics
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  }> {
    try {
      const response = await this.client.get<ApiResponse<{
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        closed: number;
      }>>('/stats');

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to fetch stats');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}
