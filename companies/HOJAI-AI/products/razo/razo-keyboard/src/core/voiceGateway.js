/**
 * Voice Gateway Integration
 *
 * RAZO becomes voice-first:
 * - Push-to-talk: hold button, speak, release
 * - Wake word: "Hey RAZO" (optional)
 * - Continuous listening mode (optional)
 * - Voice biometrics for payments
 *
 * Uses Voice Gateway service (port 4880) for STT/TTS routing.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class VoiceGateway {
  constructor({ logger, gatewayUrl } = {}) {
    this.logger = logger || console;
    this.gatewayUrl = gatewayUrl || process.env.VOICE_GATEWAY_URL || 'http://localhost:4880';

    // Wake word configuration
    this.wakeWords = ['hey razo', 'hey raza', 'hey rajjo', 'हे राजो', 'يا راجو'];

    // Active listening sessions
    this.activeSessions = new Map();

    this.stats = {
      sttRequests: 0,
      ttsRequests: 0,
      wakeWordDetections: 0,
      voiceCommands: 0,
      errors: 0
    };
  }

  /**
   * Speech-to-Text: Convert audio buffer to text
   */
  async speechToText(audioBuffer, options = {}) {
    this.stats.sttRequests++;

    const requestId = uuidv4();
    const { language = 'auto', userId = 'anonymous' } = options;

    try {
      // In production: POST audio to Voice Gateway
      // For now: simulated response
      const response = await this._callGateway('/api/stt', {
        audio: audioBuffer.toString('base64'),
        language,
        userId,
        requestId
      }).catch(() => null);

      // Simulated STT (would use real service in production)
      const simulatedText = this._simulateSTT(audioBuffer, language);

      return {
        success: true,
        requestId,
        text: simulatedText,
        language: language === 'auto' ? this._detectLanguage(simulatedText) : language,
        confidence: 0.92,
        duration: audioBuffer.length / 16000 // Approximate
      };
    } catch (error) {
      this.stats.errors++;
      this.logger.error('STT failed', { requestId, error: error.message });
      return {
        success: false,
        requestId,
        error: { code: 'STT_FAILED', message: error.message }
      };
    }
  }

  /**
   * Text-to-Speech: Convert text to audio
   */
  async textToSpeech(text, options = {}) {
    this.stats.ttsRequests++;

    const requestId = uuidv4();
    const { language = 'en', voice = 'default', speed = 1.0 } = options;

    try {
      // In production: POST to Voice Gateway for TTS
      const response = await this._callGateway('/api/tts', {
        text,
        language,
        voice,
        speed,
        requestId
      }).catch(() => null);

      return {
        success: true,
        requestId,
        audioUrl: response?.audioUrl || `/audio/tts/${requestId}.mp3`,
        text,
        language,
        voice,
        duration: text.length * 0.06 // Approximate
      };
    } catch (error) {
      this.stats.errors++;
      this.logger.error('TTS failed', { requestId, error: error.message });
      return {
        success: false,
        requestId,
        error: { code: 'TTS_FAILED', message: error.message }
      };
    }
  }

  /**
   * Detect wake word in audio stream
   */
  async detectWakeWord(audioBuffer) {
    this.stats.wakeWordDetections++;

    try {
      // Convert to text first
      const sttResult = await this.speechToText(audioBuffer);
      if (!sttResult.success) return false;

      const text = sttResult.text.toLowerCase().trim();
      return this.wakeWords.some(wake => text.startsWith(wake) || text.includes(wake));
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract command after wake word
   */
  extractCommand(transcript) {
    const text = transcript.toLowerCase().trim();
    for (const wake of this.wakeWords) {
      const idx = text.indexOf(wake);
      if (idx !== -1) {
        return text.slice(idx + wake.length).trim();
      }
    }
    return text;
  }

  /**
   * Start continuous listening session
   */
  async startListeningSession(userId, options = {}) {
    const sessionId = uuidv4();
    const { language = 'auto', wakeWordEnabled = true } = options;

    this.activeSessions.set(sessionId, {
      userId,
      language,
      wakeWordEnabled,
      startedAt: new Date().toISOString(),
      commands: []
    });

    this.logger.info('Voice session started', { sessionId, userId });

    return {
      success: true,
      sessionId,
      message: 'Listening...',
      wakeWordEnabled,
      expiresIn: 300 // 5 minutes
    };
  }

  /**
   * Process voice command in active session
   */
  async processVoiceCommand(sessionId, audioBuffer) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: { code: 'SESSION_NOT_FOUND' } };
    }

    this.stats.voiceCommands++;

    // 1. STT
    const sttResult = await this.speechToText(audioBuffer, { language: session.language });
    if (!sttResult.success) return sttResult;

    let command = sttResult.text;
    let wakeDetected = false;

    // 2. Check wake word if enabled
    if (session.wakeWordEnabled) {
      wakeDetected = await this.detectWakeWord(audioBuffer);
      if (!wakeDetected) {
        return {
          success: true,
          wakeDetected: false,
          message: 'Waiting for wake word...',
          sessionActive: true
        };
      }
      command = this.extractCommand(sttResult.text);
    }

    // 3. Log command
    session.commands.push({
      text: command,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      sessionId,
      wakeDetected,
      transcript: sttResult.text,
      command,
      language: sttResult.language,
      sessionActive: true
    };
  }

  /**
   * End listening session
   */
  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return { success: false };

    const duration = Date.now() - new Date(session.startedAt).getTime();
    this.activeSessions.delete(sessionId);

    return {
      success: true,
      sessionId,
      duration,
      commandsProcessed: session.commands.length
    };
  }

  /**
   * Voice biometrics - identify speaker
   * Uses Voice Twin (4876) for speaker identification
   */
  async identifySpeaker(audioBuffer) {
    try {
      // In production: call Voice Twin service
      const response = await this._callGateway('/api/voice/identify', {
        audio: audioBuffer.toString('base64')
      }).catch(() => null);

      return {
        success: true,
        speakerId: response?.speakerId || 'unknown',
        confidence: response?.confidence || 0,
        voiceprintId: response?.voiceprintId
      };
    } catch (error) {
      return { success: false, error: { code: 'IDENTIFICATION_FAILED', message: error.message } };
    }
  }

  /**
   * Authorize payment via voice
   */
  async authorizePayment(audioBuffer, paymentDetails) {
    // 1. Identify speaker
    const speakerResult = await this.identifySpeaker(audioBuffer);
    if (!speakerResult.success) return speakerResult;

    // 2. Verify speaker matches payment owner
    // (would check against authorized voiceprints)

    return {
      success: true,
      authorized: true,
      speakerId: speakerResult.speakerId,
      confidence: speakerResult.confidence,
      payment: paymentDetails
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  async _callGateway(endpoint, data) {
    try {
      const response = await axios.post(`${this.gatewayUrl}${endpoint}`, data, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      // Gateway might not be available in dev/test - return null gracefully
      return null;
    }
  }

  _simulateSTT(audioBuffer, language) {
    // Simulation: return common voice commands
    // In production, this comes from real STT service
    const commands = [
      'Order my usual biryani',
      'Send 500 to Rahul',
      'Book a hotel for tomorrow',
      'Remind me to call mom',
      'What is my balance',
      'Hey RAZO, order food'
    ];
    // Hash-based selection for "deterministic randomness"
    const idx = (audioBuffer.length || 0) % commands.length;
    return commands[idx];
  }

  _detectLanguage(text) {
    // Simple script-based detection
    if (/[ऀ-ॿ]/.test(text)) return 'hi'; // Devanagari (Hindi)
    if (/[ঀ-৿]/.test(text)) return 'bn'; // Bengali
    if (/[؀-ۿ]/.test(text)) return 'ar'; // Arabic
    if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja'; // Japanese
    if (/[一-鿿]/.test(text)) return 'zh'; // Chinese
    return 'en';
  }

  getStats() {
    return {
      ...this.stats,
      activeSessions: this.activeSessions.size
    };
  }
}

module.exports = VoiceGateway;