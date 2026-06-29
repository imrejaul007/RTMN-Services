/**
 * HOJAI Slack Integration
 * Real Slack bot with message handling, channels, and workflows
 */

const express = require('express');
const axios = require('axios');

class SlackClient {
  constructor(config) {
    this.botToken = config.botToken;
    this.signingSecret = config.signingSecret;
    this.app = express();
    this.webhookUrl = config.webhookUrl;
  }

  // Send a message to a channel
  async sendMessage(channel, text, blocks = []) {
    try {
      const response = await axios.post('https://slack.com/api/chat.postMessage', {
        channel,
        text,
        blocks: blocks.length ? blocks : undefined,
      }, {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error) {
      console.error('Slack send error:', error.message);
      throw error;
    }
  }

  // Send direct message to user
  async dm(userId, text, blocks = []) {
    // First get user's DM channel
    const conversation = await this.openDm(userId);
    return this.sendMessage(conversation.channel.id, text, blocks);
  }

  // Open DM with user
  async openDm(userId) {
    const response = await axios.post('https://slack.com/api/conversations.open', {
      users: userId,
    }, {
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.channel;
  }

  // List channels
  async listChannels() {
    const response = await axios.get('https://slack.com/api/conversations.list', {
      params: { types: 'public_channel,private_channel' },
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
      },
    });

    return response.data.channels;
  }

  // Create a channel
  async createChannel(name, isPrivate = false) {
    const response = await axios.post('https://slack.com/api/conversations.create', {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      is_private: isPrivate,
    }, {
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.channel;
  }

  // Schedule message
  async scheduleMessage(channel, text, postAt) {
    const response = await axios.post('https://slack.com/api/chat.scheduleMessage', {
      channel,
      text,
      post_at: postAt.toISOString(),
    }, {
      headers: {
        'Authorization': `Bearer ${this.webhookUrl}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  // Upload file
  async uploadFile(channel, file, filename, title) {
    const formData = new FormData();
    formData.append('file', file.buffer, filename);
    formData.append('channels', channel);
    formData.append('title', title);

    const response = await axios.post('https://slack.com/api/files.upload', formData, {
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        ...formData.getHeaders(),
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.file;
  }

  // Interactive components (buttons, dropdowns)
  buildInteractive(message, actions) {
    return {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message },
        },
        {
          type: 'actions',
          block_id: 'action_block',
          elements: actions.map(a => ({
            type: 'button',
            text: { type: 'plain_text', text: a.label },
            action_id: a.action,
            value: a.value,
            style: a.style, // primary, danger
          })),
        },
      ],
    };
  }

  // Build rich message with sections
  buildRichMessage(sections) {
    return {
      blocks: sections.map(s => ({
        type: 'section',
        text: { type: 'mrkdwn', text: s.text },
        fields: s.fields ? s.fields.map(f => ({ type: 'mrkdwn', text: f })) : undefined,
        accessory: s.accessory ? {
          type: 'image',
          image_url: s.accessory.url,
          alt_text: s.accessory.alt || 'image',
        } : undefined,
      })),
    };
  }
}

module.exports = SlackClient;
