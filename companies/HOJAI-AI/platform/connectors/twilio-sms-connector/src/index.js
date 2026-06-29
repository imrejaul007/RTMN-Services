/**
 * Twilio SMS Connector
 * Send SMS messages via Twilio API
 */

const twilio = require('twilio');
const express = require('express');
const cors = require('cors');

class TwilioSMSClient {
  constructor(config) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    this.messagingServiceSid = config.messagingServiceSid;
    this.client = twilio(config.accountSid, config.authToken);
  }

  // Send SMS
  async sendSMS({ to, message, mediaUrl }) {
    try {
      const params = {
        to,
        body: message,
      };

      if (this.messagingServiceSid) {
        params.messagingServiceSid = this.messagingServiceSid;
      } else {
        params.from = this.fromNumber;
      }

      if (mediaUrl) {
        params.mediaUrl = [mediaUrl];
      }

      const result = await this.client.messages.create(params);

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        to: result.to,
        from: result.from,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send bulk SMS
  async sendBulk({ recipients, message, options = {} }) {
    const results = [];
    const batchSize = options.batchSize || 100;
    const delay = options.delayMs || 100;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(to => this.sendSMS({ to, message }))
      );

      results.push(...batchResults);

      if (i + batchSize < recipients.length) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    return {
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
      results,
    };
  }

  // Send OTP
  async sendOTP(to, code, customMessage) {
    const message = customMessage || `Your verification code is: ${code}. Valid for 10 minutes.`;
    return this.sendSMS({ to, message });
  }

  // Get delivery status
  async getStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        sentAt: message.dateSent,
        deliveredAt: message.dateUpdated,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get account balance
  async getBalance() {
    try {
      const balance = await this.client.balance.fetch();
      return {
        balance: balance.balance,
        currency: balance.currency,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Validate phone number
  async validateNumber(phoneNumber) {
    try {
      const lookup = await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch();
      return {
        valid: lookup.valid,
        countryCode: lookup.countryCode,
        nationalFormat: lookup.nationalFormat,
        carrier: lookup.carrier?.name,
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = TwilioSMSClient;
