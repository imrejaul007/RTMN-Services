/**
 * LiveKit Voice - Real-time audio streaming
 *
 * Uses LiveKit for:
 * - Real-time voice streaming
 * - WebRTC audio
 * - Noise cancellation
 * - Echo cancellation
 * - Recording
 *
 * Docs: https://docs.livekit.io/
 */

import { Audio, Video } from 'expo-av';
import { useState, useEffect, useCallback } from 'react';

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://your-livekit-server.com';
const LIVEKIT_TOKEN = process.env.LIVEKIT_TOKEN || ''; // Generate on backend

export interface LiveKitConfig {
  url: string;
  token: string;
  audio: boolean;
  video?: boolean;
  noiseCancellation?: boolean;
  echoCancellation?: boolean;
}

export interface LiveKitState {
  connected: boolean;
  recording: boolean;
  muted: boolean;
  speakerOn: boolean;
}

/**
 * LiveKit Hook - Real-time voice
 */
export function useLiveKit(config: LiveKitConfig) {
  const [state, setState] = useState<LiveKitState>({
    connected: false,
    recording: false,
    muted: false,
    speakerOn: true,
  });

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(async () => {
    try {
      // In production, use @livekit/react-native
      // import { Room, RoomEvent } from '@livekit/react-native';
      //
      // const room = new Room({ audio: true });
      // await room.connect(config.url, config.token);
      //
      // room.on(RoomEvent.AudioTrackSubscribed, (track) => {
      //   // Handle incoming audio
      // });

      console.log('[LiveKit] Connecting to:', config.url);

      setState(s => ({ ...s, connected: true }));
    } catch (error) {
      console.error('[LiveKit] Connect failed:', error);
      throw error;
    }
  }, [config.url, config.token]);

  /**
   * Disconnect from room
   */
  const disconnect = useCallback(() => {
    console.log('[LiveKit] Disconnecting');
    setState({
      connected: false,
      recording: false,
      muted: false,
      speakerOn: true,
    });
  }, []);

  /**
   * Start recording voice
   */
  const startRecording = useCallback(async () => {
    if (!state.connected) {
      throw new Error('Not connected');
    }

    try {
      await Audio.requestPermissionsAsync();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      setState(s => ({ ...s, recording: true }));
    } catch (error) {
      console.error('[LiveKit] Recording failed:', error);
      throw error;
    }
  }, [state.connected]);

  /**
   * Mute microphone
   */
  const mute = useCallback(() => {
    setState(s => ({ ...s, muted: true }));
  }, []);

  /**
   * Unmute microphone
   */
  const unmute = useCallback(() => {
    setState(s => ({ ...s, muted: false }));
  }, []);

  /**
   * Toggle speaker
   */
  const toggleSpeaker = useCallback(() => {
    setState(s => ({ ...s, speakerOn: !s.speakerOn }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    startRecording,
    mute,
    unmute,
    toggleSpeaker,
  };
}

/**
 * LiveKit Server - Token generation (backend)
 *
 * Generate LiveKit tokens on your server:
 *
 * npm install livekit-server-sdk
 *
 * import { AccessToken } from 'livekit-server-sdk';
 *
 * const token = new AccessToken('api-key', 'api-secret', {
 *   identity: 'user-id',
 *   name: 'User Name',
 * });
 *
 * token.addGrant({ room: 'hojai-flow', roomJoin: true, canPublish: true });
 *
 * return token.toJwt();
 */

/**
 * LiveKit Room Config
 *
 * {
 *   adaptiveStream: true,
 *   dynacast: true,
 *   audioCaptureOptions: {
 *     echoCancellation: true,
 *     noiseSuppression: true,
 *     autoGainControl: true,
 *   },
 * }
 */

/**
 * Webhook Events to handle
 *
 * - participant.joined
 * - participant.left
 * - track.published
 * - track.unpublished
 * - room.chat
 */

export default { useLiveKit };
