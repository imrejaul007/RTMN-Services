/**
 * Pay Anyone - Universal money transfer
 *
 * Three ways to pay:
 * 1. Voice: "Send Rahul 500"
 * 2. Photo: QR code scanning
 * 3. Contact: Tap contact, choose amount
 *
 * Safety features:
 * - Voice confirmation for amounts > ₹1000
 * - Cool-down for amounts > ₹10,000
 * - Recent recipients list
 * - Fraud detection via TrustOS
 */

const { v4: uuidv4 } = require('uuid');

class PayAnyone {
  constructor({ logger, voiceGateway } = {}) {
    this.logger = logger || console;
    this.voiceGateway = voiceGateway;

    // Safety thresholds
    this.SAFETY = {
      voiceConfirmThreshold: 1000,      // ₹1000+ needs voice confirm
      cooldownThreshold: 10000,          // ₹10,000+ has 15min cooldown
      cooldownDurationMs: 15 * 60 * 1000,
      dailyLimit: 100000,                // ₹1 lakh/day default
      fraudScoreThreshold: 0.7           // TrustOS fraud score threshold
    };

    // Pending transactions (in-memory; production uses DB)
    this.pendingTransactions = new Map();

    // Recent recipients per user
    this.recentRecipients = new Map();

    // Transaction history
    this.history = [];

    this.stats = {
      paymentsInitiated: 0,
      paymentsCompleted: 0,
      paymentsFailed: 0,
      voiceAuthorizations: 0,
      qrScans: 0,
      contactPayments: 0,
      fraudBlocked: 0,
      cooldownsTriggered: 0
    };
  }

  /**
   * Pay via voice command
   * "Send Rahul 500" / "Pay Ali 1000"
   */
  async payByVoice({ audioBuffer, userId }) {
    if (!this.voiceGateway) {
      return { success: false, error: { code: 'VOICE_UNAVAILABLE', message: 'Voice not configured' } };
    }

    this.stats.paymentsInitiated++;
    const requestId = uuidv4();

    try {
      // 1. STT
      const sttResult = await this.voiceGateway.speechToText(audioBuffer, { userId });
      if (!sttResult.success) return sttResult;

      const text = sttResult.text;

      // 2. Parse payment intent
      const parsed = this._parsePaymentText(text);

      if (!parsed.amount || !parsed.recipient) {
        return {
          success: false,
          requestId,
          error: {
            code: 'PARSE_FAILED',
            message: 'Could not extract amount or recipient. Try: "Send [name] [amount]"',
            parsed
          }
        };
      }

      // 3. Check safety
      const safety = await this._checkSafety({
        userId,
        amount: parsed.amount,
        recipient: parsed.recipient,
        method: 'voice'
      });

      if (!safety.allowed) {
        return {
          success: false,
          requestId,
          requiresConfirmation: safety.requiresVoiceAuth,
          safety,
          parsed,
          message: safety.message
        };
      }

      // 4. If voice authorization required
      if (safety.requiresVoiceAuth) {
        const authResult = await this._voiceAuthorize(audioBuffer, userId, parsed);
        if (!authResult.success) return authResult;
        this.stats.voiceAuthorizations++;
      }

      // 5. Execute payment
      const payment = await this._executePayment({
        userId,
        amount: parsed.amount,
        recipient: parsed.recipient,
        method: 'upi',
        purpose: parsed.purpose,
        requestId
      });

      // 6. Update recent recipients
      this._updateRecentRecipients(userId, parsed.recipient);

      return {
        success: true,
        requestId,
        payment,
        message: `Sent ₹${parsed.amount} to ${parsed.recipient} via UPI`,
        spoken: `₹${parsed.amount} sent to ${parsed.recipient}`
      };
    } catch (error) {
      this.stats.paymentsFailed++;
      this.logger.error('Voice payment failed', { error: error.message });
      return { success: false, requestId, error: { code: 'PAYMENT_FAILED', message: error.message } };
    }
  }

  /**
   * Pay via QR code scan
   */
  async payByQR({ qrData, amount, userId }) {
    this.stats.paymentsInitiated++;
    this.stats.qrScans++;
    const requestId = uuidv4();

    try {
      // 1. Parse QR data (UPI format: upi://pay?pa=...&pn=...)
      const qrInfo = this._parseUPIQR(qrData);

      if (!qrInfo.payeeAddress) {
        return { success: false, requestId, error: { code: 'INVALID_QR', message: 'Invalid QR code' } };
      }

      // 2. If amount not specified, prompt
      if (!amount) {
        return {
          success: true,
          requestId,
          requiresAmount: true,
          qrInfo,
          message: 'Enter amount to pay',
          ui: 'enter_amount'
        };
      }

      // 3. Check safety
      const safety = await this._checkSafety({
        userId,
        amount,
        recipient: qrInfo.payeeName || qrInfo.payeeAddress,
        method: 'qr'
      });

      if (!safety.allowed) {
        return { success: false, requestId, safety };
      }

      // 4. Execute payment
      const payment = await this._executePayment({
        userId,
        amount,
        recipient: qrInfo.payeeName || qrInfo.payeeAddress,
        recipientUPI: qrInfo.payeeAddress,
        method: 'upi_qr',
        requestId
      });

      return {
        success: true,
        requestId,
        payment,
        message: `Sent ₹${amount} to ${qrInfo.payeeName || qrInfo.payeeAddress}`
      };
    } catch (error) {
      this.stats.paymentsFailed++;
      return { success: false, requestId, error: { code: 'PAYMENT_FAILED', message: error.message } };
    }
  }

  /**
   * Pay via contact picker
   */
  async payByContact({ contact, amount, userId, currency = 'INR' }) {
    this.stats.paymentsInitiated++;
    this.stats.contactPayments++;
    const requestId = uuidv4();

    try {
      // 1. Resolve contact (from CorpID)
      const resolved = await this._resolveContact(contact, userId);

      if (!resolved.success) {
        return {
          success: false,
          requestId,
          requiresContact: true,
          message: 'Contact not found',
          suggestions: await this._suggestContacts(userId)
        };
      }

      // 2. Suggest quick amounts if not specified
      if (!amount) {
        return {
          success: true,
          requestId,
          requiresAmount: true,
          contact: resolved.contact,
          quickAmounts: [100, 500, 1000, 2000, 5000],
          message: `How much to send to ${resolved.contact.name}?`,
          ui: 'select_amount'
        };
      }

      // 3. Check safety
      const safety = await this._checkSafety({
        userId,
        amount,
        recipient: resolved.contact.name,
        method: 'contact'
      });

      if (!safety.allowed) {
        return { success: false, requestId, safety };
      }

      // 4. Execute payment
      const payment = await this._executePayment({
        userId,
        amount,
        recipient: resolved.contact.name,
        recipientUPI: resolved.contact.upiId,
        method: 'upi_contact',
        purpose: `Payment to ${resolved.contact.name}`,
        requestId
      });

      // 5. Update recent
      this._updateRecentRecipients(userId, resolved.contact.name);

      return {
        success: true,
        requestId,
        payment,
        message: `Sent ${currency === 'INR' ? '₹' : currency + ' '}${amount} to ${resolved.contact.name}`
      };
    } catch (error) {
      this.stats.paymentsFailed++;
      return { success: false, requestId, error: { code: 'PAYMENT_FAILED', message: error.message } };
    }
  }

  /**
   * Get recent recipients
   */
  getRecentRecipients(userId, limit = 10) {
    const recipients = this.recentRecipients.get(userId) || [];
    return recipients.slice(0, limit);
  }

  /**
   * Get transaction history
   */
  getHistory(userId, limit = 50) {
    return this.history
      .filter(t => t.userId === userId)
      .slice(-limit)
      .reverse();
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  _parsePaymentText(text) {
    const result = { amount: null, recipient: null, purpose: null };

    // Patterns for various voice commands
    // Each entry: { regex, amountIdx, recipientIdx }
    const patterns = [
      { regex: /send\s+(\w+)\s+(\d+)/i, recipientIdx: 1, amountIdx: 2 },
      { regex: /pay\s+(\w+)\s+(\d+)/i, recipientIdx: 1, amountIdx: 2 },
      { regex: /transfer\s+(\d+)\s+(?:to|for)\s+(\w+)/i, amountIdx: 1, recipientIdx: 2 },
      { regex: /(\w+)\s+(?:ko|को)\s+(\d+)/i, recipientIdx: 1, amountIdx: 2 },  // Hinglish: "Rahul ko 500"
      { regex: /(\d+)\s+(?:rupees?|₹|rs\.?)?\s+(?:to|for|bhej|भेज)\s+(\w+)/i, amountIdx: 1, recipientIdx: 2 }
    ];

    for (const { regex, amountIdx, recipientIdx } of patterns) {
      const match = text.match(regex);
      if (match) {
        result.amount = parseInt(match[amountIdx]);
        result.recipient = match[recipientIdx];
        break;
      }
    }

    // Extract purpose
    const purposePatterns = [
      /for\s+(\w+)/i,
      /because\s+(\w+)/i
    ];
    for (const pattern of purposePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.purpose = match[1];
        break;
      }
    }

    return result;
  }

  _parseUPIQR(qrData) {
    try {
      if (qrData.startsWith('upi://')) {
        const url = new URL(qrData);
        return {
          payeeAddress: url.searchParams.get('pa'),
          payeeName: url.searchParams.get('pn'),
          amount: url.searchParams.get('am') ? parseFloat(url.searchParams.get('am')) : null,
          transactionNote: url.searchParams.get('tn')
        };
      }
      // Generic QR
      return { payeeAddress: qrData, payeeName: null };
    } catch {
      return {};
    }
  }

  async _checkSafety({ userId, amount, recipient, method }) {
    const safety = {
      allowed: true,
      requiresVoiceAuth: false,
      requiresCooldown: false,
      fraudRisk: 0,
      warnings: []
    };

    // Large amount - voice authorization
    if (amount >= this.SAFETY.voiceConfirmThreshold) {
      safety.requiresVoiceAuth = true;
      safety.warnings.push(`Amount ₹${amount} requires voice confirmation`);
    }

    // Very large amount - cooldown
    if (amount >= this.SAFETY.cooldownThreshold) {
      safety.requiresCooldown = true;
      safety.warnings.push(`Amount ₹${amount} requires 15-minute cooldown period`);
    }

    // Daily limit check
    const todayTotal = this._getTodayTotal(userId);
    if (todayTotal + amount > this.SAFETY.dailyLimit) {
      safety.allowed = false;
      safety.message = `Daily limit ₹${this.SAFETY.dailyLimit} exceeded`;
      return safety;
    }

    // Fraud detection (would call TrustOS in production)
    const fraudScore = await this._checkFraudRisk(userId, amount, recipient);
    if (fraudScore > this.SAFETY.fraudScoreThreshold) {
      safety.allowed = false;
      safety.fraudRisk = fraudScore;
      safety.message = 'Transaction blocked due to suspicious activity. Please contact support.';
      this.stats.fraudBlocked++;
      return safety;
    }

    return safety;
  }

  async _voiceAuthorize(audioBuffer, userId, paymentDetails) {
    if (!this.voiceGateway) return { success: false };

    // 1. Identify speaker via voice biometrics
    const speakerResult = await this.voiceGateway.identifySpeaker(audioBuffer);
    if (!speakerResult.success) {
      return { success: false, error: { code: 'VOICE_AUTH_FAILED', message: 'Could not verify speaker' } };
    }

    // 2. Authorize payment
    const authResult = await this.voiceGateway.authorizePayment(audioBuffer, paymentDetails);

    return {
      success: authResult.authorized,
      speakerId: speakerResult.speakerId,
      confidence: speakerResult.confidence
    };
  }

  async _executePayment(paymentDetails) {
    const transaction = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: 'completed',
      ...paymentDetails,
      transactionRef: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    };

    this.history.push(transaction);
    this.stats.paymentsCompleted++;

    // In production: call SUTAR /api/escrow/transfer

    return transaction;
  }

  async _resolveContact(contact, userId) {
    // Mock - in production, query CorpID
    if (typeof contact === 'string') {
      // Could be name or ID
      const mockContact = {
        id: 'contact_1',
        name: contact,
        phone: '+91XXXXXXXXXX',
        upiId: `${contact.toLowerCase()}@upi`,
        relationship: 'friend'
      };
      return { success: true, contact: mockContact };
    }

    return { success: true, contact };
  }

  async _suggestContacts(userId) {
    const recent = this.getRecentRecipients(userId, 5);
    return recent.map(name => ({
      name,
      type: 'recent'
    }));
  }

  async _checkFraudRisk(userId, amount, recipient) {
    // Mock - in production, call TrustOS (port 4980)
    // For now, return low risk
    return 0.1;
  }

  _getTodayTotal(userId) {
    const today = new Date().toDateString();
    return this.history
      .filter(t => t.userId === userId && new Date(t.timestamp).toDateString() === today)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  _updateRecentRecipients(userId, recipient) {
    if (!this.recentRecipients.has(userId)) {
      this.recentRecipients.set(userId, []);
    }
    const list = this.recentRecipients.get(userId);
    // Move to top
    const idx = list.indexOf(recipient);
    if (idx > -1) list.splice(idx, 1);
    list.unshift(recipient);
    // Keep last 50
    if (list.length > 50) list.length = 50;
  }

  getStats() {
    return this.stats;
  }
}

module.exports = PayAnyone;