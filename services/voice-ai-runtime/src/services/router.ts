import winston from 'winston';
import type { IVRFlow, IVROption } from '../types.js';

// Default IVR flows
const DEFAULT_IVR_FLOWS: Record<string, IVRFlow> = {
  main: {
    id: 'main',
    name: 'Main Menu',
    initialState: 'welcome',
    states: {
      welcome: {
        prompt: 'Thank you for calling. For English, press one. Para espanol, oprima dos.',
        timeout: 5,
        maxAttempts: 2,
        options: [
          { digit: '1', prompt: 'English selected', action: 'set_language', params: { language: 'en-US' } },
          { digit: '2', prompt: 'Spanish selected', action: 'set_language', params: { language: 'es-ES' } },
        ],
        onFallback: 'agent',
      },
      main_menu: {
        prompt: 'For sales, press one. For support, press two. For account inquiries, press three. To speak with an agent, press zero.',
        timeout: 5,
        maxAttempts: 3,
        options: [
          { digit: '1', prompt: 'Sales department', action: 'transfer', params: { queue: 'sales' } },
          { digit: '2', prompt: 'Support department', action: 'transfer', params: { queue: 'support' } },
          { digit: '3', prompt: 'Account inquiries', action: 'transfer', params: { queue: 'accounting' } },
          { digit: '0', prompt: 'Connecting to agent', action: 'transfer', params: { queue: 'general' } },
        ],
        onFallback: 'agent',
      },
      sales: {
        prompt: 'Our sales team can help you. Please hold.',
        action: 'transfer',
        params: { queue: 'sales' },
      },
      support: {
        prompt: 'Our support team can help you. Please hold.',
        action: 'transfer',
        params: { queue: 'support' },
      },
    },
  },
  support: {
    id: 'support',
    name: 'Support Menu',
    initialState: 'issue_type',
    states: {
      issue_type: {
        prompt: 'For technical issues, press one. For billing questions, press two. For order status, press three.',
        timeout: 5,
        maxAttempts: 2,
        options: [
          { digit: '1', prompt: 'Technical support', action: 'route_issue', params: { category: 'technical' } },
          { digit: '2', prompt: 'Billing department', action: 'route_issue', params: { category: 'billing' } },
          { digit: '3', prompt: 'Order inquiries', action: 'route_issue', params: { category: 'order' } },
        ],
        onFallback: 'agent',
      },
    },
  },
  appointment: {
    id: 'appointment',
    name: 'Appointment Booking',
    initialState: 'service_type',
    states: {
      service_type: {
        prompt: 'To schedule an appointment, press one. To reschedule, press two. To cancel, press three.',
        timeout: 5,
        maxAttempts: 2,
        options: [
          { digit: '1', prompt: 'New appointment', action: 'collect_info', params: { type: 'schedule' } },
          { digit: '2', prompt: 'Reschedule', action: 'collect_info', params: { type: 'reschedule' } },
          { digit: '3', prompt: 'Cancel appointment', action: 'collect_info', params: { type: 'cancel' } },
        ],
        onFallback: 'agent',
      },
    },
  },
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

export interface RouterOptions {
  defaultFlow?: string;
  transferTimeout?: number;
  enableFallback?: boolean;
}

export class IVRRouter {
  private flows: Map<string, IVRFlow> = new Map();
  private defaultFlow: string;
  private transferTimeout: number;
  private enableFallback: boolean;

  constructor(options: RouterOptions = {}) {
    this.defaultFlow = options.defaultFlow || 'main';
    this.transferTimeout = options.transferTimeout || 30;
    this.enableFallback = options.enableFallback !== false;

    // Load default flows
    for (const [id, flow] of Object.entries(DEFAULT_IVR_FLOWS)) {
      this.flows.set(id, flow);
    }

    logger.info('IVR Router initialized', {
      defaultFlow: this.defaultFlow,
      flows: Array.from(this.flows.keys()),
    });
  }

  registerFlow(flow: IVRFlow): void {
    this.flows.set(flow.id, flow);
    logger.info('IVR flow registered', { flowId: flow.id, name: flow.name });
  }

  getFlow(flowId: string): IVRFlow | undefined {
    return this.flows.get(flowId);
  }

  getInitialState(flowId?: string): { flowId: string; state: string; prompt: string } | null {
    const flow = this.flows.get(flowId || this.defaultFlow);
    if (!flow) {
      return null;
    }

    const state = flow.states[flow.initialState];
    if (!state) {
      return null;
    }

    return {
      flowId: flow.id,
      state: flow.initialState,
      prompt: state.prompt,
    };
  }

  processInput(
    flowId: string,
    currentState: string,
    digit: string
  ): {
    nextState?: string;
    prompt?: string;
    action: 'continue' | 'transfer' | 'collect_info' | 'end';
    transferTarget?: string;
    params?: Record<string, any>;
  } {
    const flow = this.flows.get(flowId);
    if (!flow) {
      return { action: 'continue' };
    }

    const state = flow.states[currentState];
    if (!state || !state.options) {
      return { action: 'continue' };
    }

    // Find matching option
    const option = state.options.find(o => o.digit === digit);
    if (!option) {
      return {
        action: 'continue',
        nextState: state.onFallback || currentState,
      };
    }

    // Determine next action based on action type
    switch (option.action) {
      case 'transfer':
        return {
          action: 'transfer',
          transferTarget: option.params?.queue || option.params?.targetId,
          params: option.params,
        };

      case 'set_language':
        return {
          action: 'continue',
          nextState: 'main_menu',
          params: option.params,
        };

      case 'route_issue':
        return {
          action: 'continue',
          nextState: 'agent',
          params: { ...option.params, isTransfer: true },
        };

      case 'collect_info':
        return {
          action: 'collect_info',
          params: option.params,
        };

      default:
        return { action: 'continue' };
    }
  }

  getStateConfig(flowId: string, stateId: string): IVRFlow['states'][string] | undefined {
    const flow = this.flows.get(flowId);
    return flow?.states[stateId];
  }

  shouldTransfer(flowId: string, stateId: string): boolean {
    const state = this.getStateConfig(flowId, stateId);
    if (!state) return false;

    // Check if this state has a transfer action
    if (state.action === 'transfer') return true;

    // Check if state name suggests transfer (e.g., 'agent', 'sales', 'support')
    return ['agent', 'sales', 'support', 'accounting'].includes(stateId);
  }

  getTransferTarget(flowId: string, stateId: string): string | undefined {
    const state = this.getStateConfig(flowId, stateId);
    return state?.action === 'transfer' ? state.params?.queue || 'general' : undefined;
  }
}

export const ivrRouter = new IVRRouter();
