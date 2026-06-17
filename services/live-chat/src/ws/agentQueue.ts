/**
 * Agent Queue - Manages agent availability and auto-assignment
 */

import { User, AgentInfo, ChatRoom } from '../types';
import { messageStore } from '../services/messageStore';
import { v4 as uuidv4 } from 'uuid';

interface QueuedCustomer {
  userId: string;
  userName: string;
  ws: any;
  timestamp: Date;
  priority: number;
}

class AgentQueue {
  private waitingQueue: QueuedCustomer[] = [];
  private agentAssignments: Map<string, Set<string>> = new Map(); // agentId -> roomIds
  private maxChatsPerAgent = 5;

  /**
   * Register an agent coming online
   */
  registerAgent(user: User): void {
    this.agentAssignments.set(user.id, new Set());
  }

  /**
   * Remove agent when going offline
   */
  unregisterAgent(agentId: string): string[] {
    const rooms = this.agentAssignments.get(agentId) || new Set();
    const roomIds = Array.from(rooms);
    this.agentAssignments.delete(agentId);

    // Remove agent from waiting queue assignments
    this.waitingQueue.forEach(q => {
      if (q.userId.startsWith(`${agentId}_`)) {
        // Re-queue without specific agent
        const newId = uuidv4();
        q.userId = newId;
      }
    });

    return roomIds;
  }

  /**
   * Get agent info for a specific agent
   */
  getAgentInfo(agentId: string): AgentInfo | null {
    const user = messageStore.getUser(agentId);
    if (!user || user.role !== 'agent') return null;

    const rooms = this.agentAssignments.get(agentId) || new Set();
    const activeRooms = rooms.size;

    return {
      id: agentId,
      name: user.name,
      isAvailable: activeRooms < this.maxChatsPerAgent,
      currentChats: activeRooms,
      maxChats: this.maxChatsPerAgent,
    };
  }

  /**
   * Get all online agents with their info
   */
  getAllAgentsInfo(): AgentInfo[] {
    const onlineAgents = messageStore.getOnlineAgents();
    return onlineAgents.map(agent => this.getAgentInfo(agent.id)!).filter(Boolean);
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentInfo[] {
    return this.getAllAgentsInfo().filter(a => a.isAvailable);
  }

  /**
   * Add customer to waiting queue
   */
  addToQueue(userId: string, userName: string, ws: any, priority = 0): void {
    // Remove if already in queue
    this.removeFromQueue(userId);

    this.waitingQueue.push({
      userId,
      userName,
      ws,
      timestamp: new Date(),
      priority,
    });

    // Sort by priority (higher first) then by timestamp (older first)
    this.waitingQueue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  /**
   * Remove customer from waiting queue
   */
  removeFromQueue(userId: string): boolean {
    const index = this.waitingQueue.findIndex(q => q.userId === userId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if customer is in queue
   */
  isInQueue(userId: string): boolean {
    return this.waitingQueue.some(q => q.userId === userId);
  }

  /**
   * Get queue position
   */
  getQueuePosition(userId: string): number {
    const index = this.waitingQueue.findIndex(q => q.userId === userId);
    return index + 1;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.waitingQueue.length;
  }

  /**
   * Auto-assign next customer in queue to available agent
   */
  autoAssign(): { customer: QueuedCustomer; agent: AgentInfo } | null {
    if (this.waitingQueue.length === 0) return null;

    const availableAgents = this.getAvailableAgents();
    if (availableAgents.length === 0) return null;

    // Pick agent with least current chats
    const selectedAgent = availableAgents.reduce((min, agent) =>
      agent.currentChats < min.currentChats ? agent : min
    );

    const customer = this.waitingQueue.shift()!;

    // Assign room to agent
    const agentRooms = this.agentAssignments.get(selectedAgent.id) || new Set();
    agentRooms.add(customer.userId); // Using userId as temporary roomId
    this.agentAssignments.set(selectedAgent.id, agentRooms);

    return { customer, agent: selectedAgent };
  }

  /**
   * Assign customer to specific agent
   */
  assignToAgent(userId: string, agentId: string): boolean {
    const agentInfo = this.getAgentInfo(agentId);
    if (!agentInfo || !agentInfo.isAvailable) return false;

    const queueIndex = this.waitingQueue.findIndex(q => q.userId === userId);
    if (queueIndex === -1) return false;

    const customer = this.waitingQueue.splice(queueIndex, 1)[0];

    const agentRooms = this.agentAssignments.get(agentId) || new Set();
    agentRooms.add(customer.userId);
    this.agentAssignments.set(agentId, agentRooms);

    return true;
  }

  /**
   * Release customer from agent (room closed)
   */
  releaseFromAgent(userId: string, agentId: string): void {
    const agentRooms = this.agentAssignments.get(agentId);
    if (agentRooms) {
      agentRooms.delete(userId);
    }
  }

  /**
   * Transfer customer from one agent to another
   */
  transferCustomer(fromAgentId: string, toAgentId: string, customerId: string): boolean {
    // Remove from old agent
    this.releaseFromAgent(customerId, fromAgentId);

    // Add to new agent
    const toAgentInfo = this.getAgentInfo(toAgentId);
    if (!toAgentInfo || !toAgentInfo.isAvailable) {
      // Re-add to queue if new agent not available
      this.addToQueue(customerId, customerId, null);
      return false;
    }

    const toAgentRooms = this.agentAssignments.get(toAgentId) || new Set();
    toAgentRooms.add(customerId);
    this.agentAssignments.set(toAgentId, toAgentRooms);

    return true;
  }

  /**
   * Set max chats per agent
   */
  setMaxChats(max: number): void {
    this.maxChatsPerAgent = max;
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueLength: this.waitingQueue.length,
      availableAgents: this.getAvailableAgents().length,
      totalAgents: this.getAllAgentsInfo().length,
      totalAssignments: Array.from(this.agentAssignments.values()).reduce(
        (sum, rooms) => sum + rooms.size,
        0
      ),
    };
  }
}

// Singleton instance
export const agentQueue = new AgentQueue();
