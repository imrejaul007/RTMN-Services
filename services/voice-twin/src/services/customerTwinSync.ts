import http from 'http';
import https from 'https';

// Customer Twin sync service
// This service syncs voice call data with the Customer Twin service

const CUSTOMER_TWIN_URL = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

// Customer update payload interface
export interface CustomerVoiceUpdate {
  lastCallId?: string;
  lastCallAt?: Date;
  lastCallDuration?: number;
  lastCallSummary?: string;
  lastCallSentiment?: string;
  lastCallIntent?: string;
  lastCallTranscription?: string;
  callDirection?: string;
  incomingCall?: boolean;
  outgoingCall?: boolean;
}

// HTTP request helper
async function httpRequest(
  url: string,
  method: string = 'POST',
  data?: any,
  headers: Record<string, string> = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Update Customer Twin with voice call data
export async function updateCustomerTwin(
  tenantId: string,
  customerId: string,
  update: CustomerVoiceUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${CUSTOMER_TWIN_URL}/api/customer-twin/${customerId}/voice`;

    const response = await httpRequest(url, 'PATCH', {
      tenantId,
      ...update
    }, {
      'X-Tenant-ID': tenantId
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`Customer Twin updated for ${customerId}`);

      // Publish event to Event Bus
      await publishVoiceEvent(tenantId, customerId, update);

      return { success: true };
    } else {
      console.warn(`Customer Twin update failed: ${response.status}`);
      return { success: false, error: `Status: ${response.status}` };
    }
  } catch (error) {
    console.error('Error updating Customer Twin:', error);
    // Don't fail the call recording if Twin sync fails
    return { success: false, error: (error as Error).message };
  }
}

// Publish voice call event to Event Bus
async function publishVoiceEvent(
  tenantId: string,
  customerId: string,
  update: CustomerVoiceUpdate
): Promise<void> {
  try {
    const event = {
      type: 'voice.call.completed',
      tenantId,
      customerId,
      data: {
        callId: update.lastCallId,
        timestamp: new Date().toISOString(),
        sentiment: update.lastCallSentiment,
        intent: update.lastCallIntent,
        direction: update.callDirection,
        duration: update.lastCallDuration
      }
    };

    await httpRequest(`${EVENT_BUS_URL}/api/events`, 'POST', event, {
      'X-Tenant-ID': tenantId,
      'X-Event-Type': 'voice.call.completed'
    });

    console.log(`Voice event published to Event Bus`);
  } catch (error) {
    console.error('Error publishing voice event:', error);
    // Don't fail if event publish fails
  }
}

// Get customer voice history from Customer Twin
export async function getCustomerVoiceHistory(
  tenantId: string,
  customerId: string
): Promise<any> {
  try {
    const url = `${CUSTOMER_TWIN_URL}/api/customer-twin/${customerId}/voice-history`;

    const response = await httpRequest(url, 'GET', undefined, {
      'X-Tenant-ID': tenantId
    });

    if (response.status === 200) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Error getting customer voice history:', error);
    return null;
  }
}

// Link call to customer
export async function linkCallToCustomer(
  tenantId: string,
  customerId: string,
  callId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${CUSTOMER_TWIN_URL}/api/customer-twin/${customerId}/calls`;

    const response = await httpRequest(url, 'POST', {
      tenantId,
      callId,
      linkedAt: new Date().toISOString()
    }, {
      'X-Tenant-ID': tenantId
    });

    return {
      success: response.status >= 200 && response.status < 300
    };
  } catch (error) {
    console.error('Error linking call to customer:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Get customer sentiment trend
export async function getCustomerSentimentTrend(
  tenantId: string,
  customerId: string
): Promise<{ sentiment: string; count: number; percentage: string }[]> {
  try {
    const url = `${CUSTOMER_TWIN_URL}/api/customer-twin/${customerId}/sentiment-trend`;

    const response = await httpRequest(url, 'GET', undefined, {
      'X-Tenant-ID': tenantId
    });

    if (response.status === 200) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('Error getting sentiment trend:', error);
    return [];
  }
}

// Sync complete call data
export async function syncCompleteCallData(
  tenantId: string,
  customerId: string,
  callData: {
    callId: string;
    transcript: string;
    summary: string;
    sentiment: string;
    intent: string;
    duration: number;
    direction: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${CUSTOMER_TWIN_URL}/api/customer-twin/${customerId}/voice-sync`;

    const response = await httpRequest(url, 'POST', {
      tenantId,
      callData,
      syncedAt: new Date().toISOString()
    }, {
      'X-Tenant-ID': tenantId
    });

    return {
      success: response.status >= 200 && response.status < 300
    };
  } catch (error) {
    console.error('Error syncing complete call data:', error);
    return { success: false, error: (error as Error).message };
  }
}

export default {
  updateCustomerTwin,
  getCustomerVoiceHistory,
  linkCallToCustomer,
  getCustomerSentimentTrend,
  syncCompleteCallData
};
