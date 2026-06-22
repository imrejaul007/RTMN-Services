/**
 * RAZO KEYBOARD - STATE 2: VOICE INPUT MODE
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKeyboard } from './Keyboard';

interface VoiceModeProps {
  onTranscript?: (text: string) => void;
}

export function VoiceMode({ onTranscript }: VoiceModeProps) {
  const { state, toDefault, handleVoiceInput } = useKeyboard();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'voice_typing' | 'genie'>('voice_typing');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (state === 'voice') {
      startListening();
    } else {
      stopListening();
    }
  }, [state]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        handleFinalTranscript(text);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toDefault();
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleFinalTranscript = async (text: string) => {
    // Route to Intent Router
    const routedMode = handleVoiceInput(text);

    if (routedMode === 'genie' || routedMode === 'copilot') {
      setMode('genie');
      // Keep in genie mode
    } else {
      // Voice typing - insert text
      onTranscript?.(text);
      setTranscript('');
      toDefault();
    }
  };

  const handleManualStop = () => {
    stopListening();
    if (transcript) {
      handleFinalTranscript(transcript);
    } else {
      toDefault();
    }
  };

  if (state !== 'voice') return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.modeIndicator}>
          <span style={styles.micIcon}>🎤</span>
          <span style={styles.modeLabel}>
            {mode === 'voice_typing' ? 'Voice Typing' : 'Genie Mode'}
          </span>
        </div>
        <button style={styles.closeButton} onClick={toDefault}>✕</button>
      </div>

      {/* Listening Animation */}
      <div style={styles.waveformContainer}>
        <div style={styles.pulseRing} />
        <div style={styles.pulseRing2} />
        <div style={styles.pulseRing3} />
        <div style={styles.micCenter}>🎤</div>
      </div>

      {/* Transcript */}
      <div style={styles.transcriptContainer}>
        {transcript ? (
          <p style={styles.transcript}>{transcript}</p>
        ) : (
          <p style={styles.hint}>
            {mode === 'voice_typing'
              ? 'Speak now... Your words will be typed'
              : 'Speak to Genie... I\'ll help you'}
          </p>
        )}
      </div>

      {/* Visual Indicator */}
      <div style={styles.indicator}>
        <span style={styles.listeningDot} />
        <span style={styles.listeningText}>Listening</span>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.stopButton} onClick={handleManualStop}>
          ⏹️ Stop
        </button>
        <button style={styles.cancelButton} onClick={toDefault}>
          ✕ Cancel
        </button>
      </div>

      {/* Tips */}
      <div style={styles.tips}>
        <p style={styles.tipTitle}>Voice Commands:</p>
        <p style={styles.tip}>• "Hey Genie, write a message..."</p>
        <p style={styles.tip}>• "Hey CoPilot, generate a report..."</p>
        <p style={styles.tip}>• Just talk to type normally</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  modeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#FF3B3020',
    padding: '8px 16px',
    borderRadius: '20px',
  },
  micIcon: {
    fontSize: '20px',
  },
  modeLabel: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: '14px',
  },
  closeButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
  },
  waveformContainer: {
    position: 'relative',
    width: '150px',
    height: '150px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    border: '2px solid #FF3B30',
    borderRadius: '50%',
    opacity: 0.3,
    animation: 'pulse 1.5s ease-out infinite',
  },
  pulseRing2: {
    position: 'absolute',
    width: '120px',
    height: '120px',
    border: '2px solid #FF3B30',
    borderRadius: '50%',
    opacity: 0.5,
    animation: 'pulse 1.5s ease-out infinite 0.3s',
  },
  pulseRing3: {
    position: 'absolute',
    width: '90px',
    height: '90px',
    border: '2px solid #FF3B30',
    borderRadius: '50%',
    opacity: 0.7,
    animation: 'pulse 1.5s ease-out infinite 0.6s',
  },
  micCenter: {
    fontSize: '48px',
    zIndex: 1,
  },
  transcriptContainer: {
    background: '#2C2C2E',
    borderRadius: '16px',
    padding: '20px',
    width: '100%',
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcript: {
    color: '#fff',
    fontSize: '18px',
    textAlign: 'center',
    margin: 0,
  },
  hint: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
    margin: 0,
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  listeningDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#FF3B30',
    animation: 'blink 1s ease-in-out infinite',
  },
  listeningText: {
    color: '#FF3B30',
    fontSize: '14px',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  stopButton: {
    background: '#FF3B30',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '24px',
    padding: '12px 24px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tips: {
    background: '#2C2C2E',
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
  },
  tipTitle: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  tip: {
    color: '#888',
    fontSize: '11px',
    margin: '4px 0',
  },
};

export default VoiceMode;