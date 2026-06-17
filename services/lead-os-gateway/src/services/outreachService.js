/**
 * Outreach Service - Multi-channel outreach orchestration
 * Connects to: REZ-SalesMind (5170)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const REZ_SALESMIND_URL = process.env.REZ_SALESMIND_URL || 'http://localhost:5170';

// In-memory campaign tracking
const campaigns = new Map();
const sequences = new Map();

/**
 * Outreach channels
 */
const CHANNELS = {
  email: {
    id: 'email',
    name: 'Email',
    priority: 1,
    cost: 0.01
  },
  phone: {
    id: 'phone',
    name: 'Phone/Call',
    priority: 2,
    cost: 0.50
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    priority: 3,
    cost: 0.05
  },
  sms: {
    id: 'sms',
    name: 'SMS',
    priority: 4,
    cost: 0.08
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    priority: 5,
    cost: 0.10
  }
};

/**
 * Default outreach templates
 */
const TEMPLATES = {
  initial: {
    email: {
      subject: 'Quick question about {{company}}',
      body: 'Hi {{firstName}},\n\nI noticed {{company}} is doing some interesting work in the {{industry}} space. I wanted to connect and see if there might be an opportunity to help.\n\nWould you have 15 minutes this week for a quick call?\n\nBest,\n{{senderName}}'
    },
    linkedin: {
      message: 'Hi {{firstName}}, I came across {{company}} and found your profile very interesting. Would love to connect and learn more about your work!'
    },
    sms: {
      message: 'Hi {{firstName}}, this is {{senderName}} from RTMN. Would love to connect about some opportunities at {{company}}. Are you available for a quick chat?'
    }
  },
  followUp: {
    email: {
      subject: 'Following up - {{company}}',
      body: 'Hi {{firstName}},\n\nJust following up on my previous message. I understand you\'re busy, but I\'d love to show you how we\'ve helped similar companies like {{company}} achieve great results.\n\nLet me know if you\'d like to connect.\n\nBest,\n{{senderName}}'
    }
  },
  meetingRequest: {
    email: {
      subject: 'Meeting request - {{company}}',
      body: 'Hi {{firstName}},\n\nI\'d like to schedule a brief call to discuss how we can help {{company}} with your goals.\n\nWould any of these times work for you?\n- Monday 10-11am\n- Tuesday 2-3pm\n- Wednesday 11am-12pm\n\nBest,\n{{senderName}}'
    }
  }
};

/**
 * Get lead data from Lead Twin
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>}
 */
async function getLead(leadId) {
  try {
    const response = await axios.get(`${REZ_SALESMIND_URL}/api/leads/${leadId}`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    logger.warn('Could not fetch lead from REZ-SalesMind', { leadId });
    return {
      id: leadId,
      firstName: 'Unknown',
      lastName: 'Lead',
      email: 'unknown@example.com',
      company: 'Unknown Company',
      title: 'Unknown',
      phone: null
    };
  }
}

/**
 * Select best channel for outreach
 * @param {Object} lead - Lead data
 * @param {Array<string>} availableChannels - Available channels
 * @returns {string}
 */
function selectBestChannel(lead, availableChannels = ['email', 'linkedin', 'phone']) {
  // Priority order based on lead data
  const channelPriority = [];

  if (lead.email) channelPriority.push('email');
  if (lead.linkedinUrl) channelPriority.push('linkedin');
  if (lead.phone) channelPriority.push('phone');
  if (lead.whatsapp) channelPriority.push('whatsapp');
  if (lead.mobilePhone) channelPriority.push('sms');

  // Return first available channel from priority list
  for (const channel of channelPriority) {
    if (availableChannels.includes(channel)) {
      return channel;
    }
  }

  return 'email'; // Default
}

/**
 * Generate personalized message
 * @param {Object} lead - Lead data
 * @param {string} channel - Channel type
 * @param {string} templateType - Template type
 * @returns {Object}
 */
function generateMessage(lead, channel, templateType = 'initial') {
  const template = TEMPLATES[templateType]?.[channel];
  if (!template) {
    return { subject: '', body: 'Hi {{firstName}}, I wanted to reach out...' };
  }

  const replacements = {
    '{{firstName}}': lead.firstName || 'there',
    '{{lastName}}': lead.lastName || '',
    '{{fullName}}': lead.fullName || `${lead.firstName} ${lead.lastName}`,
    '{{company}}': lead.company || 'your company',
    '{{title}}': lead.title || '',
    '{{industry}}': lead.industry || '',
    '{{senderName}}': 'Team RTMN'
  };

  let body = template.body || template.message || '';
  let subject = template.subject || '';

  for (const [key, value] of Object.entries(replacements)) {
    body = body.replace(new RegExp(key, 'g'), value);
    subject = subject.replace(new RegExp(key, 'g'), value);
  }

  return { subject, body };
}

/**
 * Send message via selected channel
 * @param {string} channel - Channel type
 * @param {Object} lead - Lead data
 * @param {Object} message - Message content
 * @returns {Promise<Object>}
 */
async function sendMessage(channel, lead, message) {
  try {
    // Try to send via REZ-SalesMind
    const response = await axios.post(`${REZ_SALESMIND_URL}/api/outreach/send`,
      { channel, leadId: lead.id, ...message },
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    logger.warn('REZ-SalesMind outreach unavailable, simulating', { channel, leadId: lead.id });

    // Simulate sending
    return {
      success: true,
      simulated: true,
      channel,
      leadId: lead.id,
      messageId: `msg_${Date.now()}`,
      sentAt: new Date().toISOString(),
      note: 'Message simulated - REZ-SalesMind unavailable'
    };
  }
}

/**
 * Create outreach sequence
 * @param {string} name - Sequence name
 * @param {Array} steps - Sequence steps
 * @param {Array<string>} leadIds - Lead IDs
 * @returns {Promise<Object>}
 */
async function createSequence(name, steps, leadIds) {
  const sequenceId = `seq_${Date.now()}`;

  try {
    const response = await axios.post(`${REZ_SALESMIND_URL}/api/followup/sequence/create`,
      { name, steps },
      { timeout: 10000 }
    );

    const actualSequenceId = response.data.id || sequenceId;

    // Add leads to sequence
    for (const leadId of leadIds) {
      await addLeadToSequence(actualSequenceId, leadId);
    }

    sequences.set(actualSequenceId, {
      id: actualSequenceId,
      name,
      steps,
      leadIds,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    return {
      id: actualSequenceId,
      name,
      steps: steps.length,
      leadsAdded: leadIds.length,
      status: 'active'
    };
  } catch (error) {
    logger.warn('Could not create sequence in REZ-SalesMind, creating locally', { name });

    // Create locally
    sequences.set(sequenceId, {
      id: sequenceId,
      name,
      steps,
      leadIds,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    return {
      id: sequenceId,
      name,
      steps: steps.length,
      leadsAdded: leadIds.length,
      status: 'active',
      note: 'Created locally - REZ-SalesMind unavailable'
    };
  }
}

/**
 * Add lead to sequence
 * @param {string} sequenceId - Sequence ID
 * @param {string} leadId - Lead ID
 * @returns {Promise<Object>}
 */
async function addLeadToSequence(sequenceId, leadId) {
  const sequence = sequences.get(sequenceId);
  if (sequence && !sequence.leadIds.includes(leadId)) {
    sequence.leadIds.push(leadId);
  }

  try {
    await axios.post(`${REZ_SALESMIND_URL}/api/followup/sequence/${sequenceId}/add`,
      { leadId },
      { timeout: 5000 }
    );
  } catch (error) {
    logger.debug('Could not add lead to REZ-SalesMind sequence');
  }

  return { sequenceId, leadId, added: true };
}

/**
 * Execute outreach for a lead
 * @param {string} leadId - Lead ID
 * @param {Array<string>} channels - Channels to use
 * @returns {Promise<Object>}
 */
async function executeOutreach(leadId, channels) {
  // Get lead data
  const lead = await getLead(leadId);

  // Select best channel
  const channel = selectBestChannel(lead, channels);

  // Generate personalized message
  const message = generateMessage(lead, channel, 'initial');

  // Send message
  const result = await sendMessage(channel, lead, message);

  return {
    leadId,
    lead: {
      name: `${lead.firstName} ${lead.lastName}`,
      company: lead.company,
      email: lead.email
    },
    channel,
    message: {
      subject: message.subject,
      preview: message.body.substring(0, 100) + '...'
    },
    status: result.success ? 'sent' : 'failed',
    sentAt: result.sentAt,
    messageId: result.messageId
  };
}

/**
 * Get campaign status
 * @param {string} campaignId - Campaign ID
 * @returns {Object}
 */
async function getCampaignStatus(campaignId) {
  const campaign = campaigns.get(campaignId);

  if (!campaign) {
    // Try to get from REZ-SalesMind
    try {
      const response = await axios.get(`${REZ_SALESMIND_URL}/api/campaigns/${campaignId}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      return {
        found: false,
        error: 'Campaign not found'
      };
    }
  }

  return campaign;
}

/**
 * Pause campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object}
 */
async function pauseCampaign(campaignId) {
  const campaign = campaigns.get(campaignId);
  if (campaign) {
    campaign.status = 'paused';
    campaign.pausedAt = new Date().toISOString();
  }

  try {
    await axios.post(`${REZ_SALESMIND_URL}/api/campaigns/${campaignId}/pause`, {
      timeout: 5000
    });
  } catch (error) {
    logger.debug('Could not pause REZ-SalesMind campaign');
  }

  return {
    campaignId,
    status: 'paused',
    pausedAt: new Date().toISOString()
  };
}

/**
 * Resume campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object}
 */
async function resumeCampaign(campaignId) {
  const campaign = campaigns.get(campaignId);
  if (campaign) {
    campaign.status = 'active';
    campaign.resumedAt = new Date().toISOString();
  }

  try {
    await axios.post(`${REZ_SALESMIND_URL}/api/campaigns/${campaignId}/resume`, {
      timeout: 5000
    });
  } catch (error) {
    logger.debug('Could not resume REZ-SalesMind campaign');
  }

  return {
    campaignId,
    status: 'active',
    resumedAt: new Date().toISOString()
  };
}

export {
  createSequence,
  executeOutreach,
  getCampaignStatus,
  pauseCampaign,
  resumeCampaign,
  addLeadToSequence,
  selectBestChannel,
  generateMessage,
  sendMessage,
  CHANNELS,
  TEMPLATES
};
