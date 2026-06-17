import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import type { VoiceMessage, VoiceSession } from '../types.js';
import { voiceSessionService } from '../services/voiceSession.js';
import { sttService } from '../services/stt.js';
import { ttsService } from '../services/tts.js';
import { llmService } from '../services/llm.js';
import { ivrRouter } from '../services/router.js';
import { transferService } from '../services/transfer.js';

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

interface WSClient {
  ws: WebSocket;
  sessionId: string;
  isAlive: boolean;
  heartbeats: number;
}

export class VoiceWebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private audioBuffers: Map<string, Buffer[]> = new Map();

  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/voice',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat monitor
    this.startHeartbeat();

    logger.info('Voice WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    // Extract session ID from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId') || uuidv4();

    const client: WSClient = {
      ws,
      sessionId,
      isAlive: true,
      heartbeats: 0,
    };

    this.clients.set(sessionId, client);
    this.audioBuffers.set(sessionId, []);

    logger.info('WebSocket client connected', { sessionId });

    // Send welcome message
    this.sendMessage(sessionId, {
      type: 'status',
      sessionId,
      data: {
        status: 'connected',
        message: 'Voice session initialized',
      },
      timestamp: Date.now(),
    });

    // Get or create session
    let session = voiceSessionService.getSession(sessionId);
    if (!session) {
      session = voiceSessionService.createSession({
        customerPhone: 'unknown',
        metadata: { source: 'websocket' },
      });
    }

    ws.on('message', async (data: Buffer) => {
      await this.handleMessage(sessionId, data);
    });

    ws.on('pong', () => {
      const client = this.clients.get(sessionId);
      if (client) {
        client.isAlive = true;
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(sessionId);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { sessionId, error: error.message });
      this.handleDisconnect(sessionId);
    });
  }

  private async handleMessage(sessionId: string, data: Buffer): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      // Check if data is JSON or binary audio
      if (data[0] === 123) {
        // Starts with '{', likely JSON
        const message: VoiceMessage = JSON.parse(data.toString());
        await this.handleVoiceMessage(sessionId, message);
      } else {
        // Binary audio data
        await this.handleAudioData(sessionId, data);
      }
    } catch (error) {
      logger.error('Error handling message', { sessionId, error });
    }
  }

  private async handleVoiceMessage(sessionId: string, message: VoiceMessage): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const session = voiceSessionService.getSession(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'audio':
        // Handle audio message with metadata
        if (message.data?.audio) {
          const audioBuffer = Buffer.from(message.data.audio, 'base64');
          await this.processAudio(sessionId, audioBuffer);
        }
        break;

      case 'text':
        // Direct text input (DTMF or typed)
        await this.processText(sessionId, message.data?.text || '', session);
        break;

      case 'action':
        // Handle action requests
        await this.handleAction(sessionId, message.data?.action, message.data?.params, session);
        break;

      case 'end':
        await this.handleEnd(sessionId, message.data?.reason || 'user_ended');
        break;

      case 'status':
        // Client asking for status
        this.sendMessage(sessionId, {
          type: 'status',
          sessionId,
          data: { status: session.status, ivrState: session.ivrState },
          timestamp: Date.now(),
        });
        break;
    }
  }

  private async handleAudioData(sessionId: string, audioData: Buffer): Promise<void> {
    // Accumulate audio chunks
    const buffers = this.audioBuffers.get(sessionId) || [];
    buffers.push(audioData);
    this.audioBuffers.set(sessionId, buffers);

    // Process every ~5 seconds of audio
    if (this.getAudioDuration(buffers) >= 5000) {
      const fullAudio = Buffer.concat(buffers);
      this.audioBuffers.set(sessionId, []);

      await this.processAudio(sessionId, fullAudio);
    }
  }

  private async processAudio(sessionId: string, audioBuffer: Buffer): Promise<void> {
    const session = voiceSessionService.getSession(sessionId);
    if (!session) return;

    try {
      // Transcribe audio
      if (!sttService.isAvailable()) {
        logger.warn('STT service unavailable');
        return;
      }

      const transcription = await sttService.transcribeAudio(audioBuffer);

      if (transcription.text.trim()) {
        // Send transcript to client
        this.sendMessage(sessionId, {
          type: 'transcript',
          sessionId,
          data: { text: transcription.text, confidence: transcription.confidence },
          timestamp: Date.now(),
        });

        // Add to session transcript
        voiceSessionService.addTranscriptEntry(sessionId, {
          role: 'user',
          text: transcription.text,
        });

        // Process the transcribed text
        await this.processText(sessionId, transcription.text, session);
      }
    } catch (error) {
      logger.error('Audio processing failed', { sessionId, error });
    }
  }

  private async processText(sessionId: string, text: string, session: VoiceSession): Promise<void> {
    if (!text.trim()) return;

    logger.info('Processing text input', { sessionId, text });

    // Check if in IVR mode
    if (session.ivrState) {
      await this.handleIVRInput(sessionId, text, session);
      return;
    }

    // Use LLM to generate response
    try {
      const response = await llmService.generateResponse(sessionId, text, {
        customerId: session.customerId,
        language: session.metadata?.language as string,
      });

      // Add to transcript
      voiceSessionService.addTranscriptEntry(sessionId, {
        role: 'assistant',
        text: response,
      });

      // Generate audio response
      if (ttsService.isAvailable()) {
        const audioBuffer = await ttsService.synthesizeSpeech(response);
        const audioBase64 = audioBuffer.toString('base64');

        this.sendMessage(sessionId, {
          type: 'audio',
          sessionId,
          data: { audio: audioBase64, text: response },
          timestamp: Date.now(),
        });
      } else {
        // Just send text response
        this.sendMessage(sessionId, {
          type: 'text',
          sessionId,
          data: { text: response },
          timestamp: Date.now(),
        });
      }

      // Check for transfer keywords
      if (this.shouldTransfer(response)) {
        await this.initiateTransfer(sessionId, session);
      }
    } catch (error) {
      logger.error('Text processing failed', { sessionId, error });

      // Fallback response
      this.sendMessage(sessionId, {
        type: 'text',
        sessionId,
        data: { text: 'I apologize, I encountered an issue processing your request. Please try again.' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleIVRInput(sessionId: string, digit: string, session: VoiceSession): Promise<void> {
    const flowId = session.metadata?.ivrFlowId || 'main';
    const currentState = session.ivrState;

    logger.info('IVR input', { sessionId, flowId, currentState, digit });

    const result = ivrRouter.processInput(flowId, currentState, digit);

    if (result.action === 'transfer') {
      // Transfer to agent
      voiceSessionService.setIVRState(sessionId, 'transferring');

      const transferResult = await transferService.transferToAgent({
        sessionId,
        targetType: 'queue',
        targetId: result.transferTarget!,
        priority: 3,
      }, session);

      this.sendMessage(sessionId, {
        type: 'transfer',
        sessionId,
        data: transferResult,
        timestamp: Date.now(),
      });
    } else if (result.prompt) {
      // Continue IVR with new prompt
      voiceSessionService.setIVRState(sessionId, result.nextState || currentState);

      // Generate audio for prompt
      if (ttsService.isAvailable()) {
        const audioBuffer = await ttsService.synthesizeSpeech(result.prompt);
        const audioBase64 = audioBuffer.toString('base64');

        this.sendMessage(sessionId, {
          type: 'audio',
          sessionId,
          data: { audio: audioBase64, text: result.prompt },
          timestamp: Date.now(),
        });
      }

      // Store any params
      if (result.params) {
        voiceSessionService.updateSession(sessionId, {
          metadata: {
            ...session.metadata,
            ivrParams: result.params,
          },
        });
      }
    }
  }

  private async handleAction(sessionId: string, action: string, params: any, session: VoiceSession): Promise<void> {
    logger.info('Handling action', { sessionId, action, params });

    switch (action) {
      case 'start_ivr':
        const ivrFlow = ivrRouter.getFlow(params?.flowId || 'main');
        if (ivrFlow) {
          const initialState = ivrRouter.getInitialState(params?.flowId);
          if (initialState) {
            voiceSessionService.setIVRState(sessionId, initialState.state);
            voiceSessionService.updateSession(sessionId, {
              metadata: {
                ...session.metadata,
                ivrFlowId: initialState.flowId,
              },
            });

            // Send initial prompt
            if (ttsService.isAvailable()) {
              const audioBuffer = await ttsService.synthesizeSpeech(initialState.prompt);
              this.sendMessage(sessionId, {
                type: 'audio',
                sessionId,
                data: { audio: audioBuffer.toString('base64'), text: initialState.prompt },
                timestamp: Date.now(),
              });
            }
          }
        }
        break;

      case 'transfer':
        await this.initiateTransfer(sessionId, session);
        break;

      case 'end':
        await this.handleEnd(sessionId, 'action_end');
        break;

      case 'get_suggestions':
        const suggestions = await transferService.getAgentSuggestions(session);
        this.sendMessage(sessionId, {
          type: 'action',
          sessionId,
          data: { action: 'suggestions', suggestions },
          timestamp: Date.now(),
        });
        break;
    }
  }

  private async initiateTransfer(sessionId: string, session: VoiceSession): Promise<void> {
    voiceSessionService.setIVRState(sessionId, 'transferring');

    const transferResult = await transferService.transferToAgent({
      sessionId,
      targetType: 'queue',
      targetId: 'general',
      priority: 3,
    }, session);

    this.sendMessage(sessionId, {
      type: 'transfer',
      sessionId,
      data: transferResult,
      timestamp: Date.now(),
    });

    // Play beep if configured
    if (process.env.BEEP_ON_TRANSFER === 'true') {
      this.sendMessage(sessionId, {
        type: 'action',
        sessionId,
        data: { action: 'beep' },
        timestamp: Date.now(),
      });
    }
  }

  private async handleEnd(sessionId: string, reason: string): Promise<void> {
    const session = voiceSessionService.endSession(sessionId, reason);
    if (!session) return;

    // Save to memory
    await transferService.saveToMemory(session);

    // Send end message
    this.sendMessage(sessionId, {
      type: 'end',
      sessionId,
      data: {
        reason,
        duration: session.duration,
        transcriptLength: session.transcript.length,
      },
      timestamp: Date.now(),
    });

    // Clean up
    this.clients.delete(sessionId);
    this.audioBuffers.delete(sessionId);
    llmService.clearHistory(sessionId);

    logger.info('Voice session ended', { sessionId, reason });
  }

  private handleDisconnect(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (client) {
      client.isAlive = false;
    }

    // Don't immediately remove - let heartbeat clean up
    logger.info('WebSocket client disconnected', { sessionId });
  }

  private sendMessage(sessionId: string, message: VoiceMessage): void {
    const client = this.clients.get(sessionId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message', { sessionId, error });
    }
  }

  private startHeartbeat(): void {
    const interval = parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000');

    this.heartbeatInterval = setInterval(() => {
      for (const [sessionId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          // Client didn't respond to pong
          client.ws.terminate();
          this.clients.delete(sessionId);
          this.audioBuffers.delete(sessionId);
          logger.info('Terminated inactive client', { sessionId });
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, interval);
  }

  private getAudioDuration(buffers: Buffer[]): number {
    // Rough estimate: 16kHz, 16-bit mono = 32KB per second
    const totalBytes = buffers.reduce((sum, b) => sum + b.length, 0);
    return Math.floor((totalBytes / 32000) * 1000);
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    this.wss?.close();
    logger.info('Voice WebSocket server closed');
  }
}

export const voiceWebSocketHandler = new VoiceWebSocketHandler();
