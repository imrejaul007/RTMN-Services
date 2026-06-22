/**
 * RAZO KEYBOARD - STATE 1: DEFAULT TYPING LAYOUT
 */

import React, { useState, useEffect } from 'react';
import { useKeyboard } from './Keyboard';

interface DefaultKeyboardProps {
  onPredict?: (text: string) => void;
}

// Key rows for QWERTY
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export function DefaultKeyboard({ onPredict }: DefaultKeyboardProps) {
  const { state, toVoiceMode, toSuggestions, toLauncher, toGenieMode } = useKeyboard();
  const [input, setInput] = useState('');
  const [predictions, setPredictions] = useState<string[]>([]);
  const [shift, setShift] = useState(false);

  // Fetch predictions
  useEffect(() => {
    if (input.length > 0) {
      fetchPredictions(input);
    } else {
      setPredictions([]);
    }
  }, [input]);

  const fetchPredictions = async (text: string) => {
    try {
      const response = await fetch('http://localhost:4640/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: text, limit: 5 }),
      });
      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch {
      // Fallback
      setPredictions([]);
    }
  };

  const handleKeyPress = (key: string) => {
    const newInput = shift ? key.toUpperCase() : key;
    setInput(prev => prev + newInput);
    setShift(false);
    onPredict?.(input + newInput);
  };

  const handleBackspace = () => {
    setInput(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setInput(prev => prev + ' ');
  };

  const handlePredictionClick = (prediction: string) => {
    setInput(prediction + ' ');
    setPredictions([]);
  };

  if (state !== 'default') return null;

  return (
    <div style={styles.container}>
      {/* Prediction Row */}
      <div style={styles.predictionRow}>
        {predictions.map((pred, i) => (
          <button
            key={i}
            style={styles.prediction}
            onClick={() => handlePredictionClick(pred)}
          >
            {pred}
          </button>
        ))}
      </div>

      {/* Input Display */}
      <div style={styles.inputDisplay}>
        {input || <span style={styles.placeholder}>Type or speak...</span>}
      </div>

      {/* Keyboard */}
      <div style={styles.keyboard}>
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} style={styles.keyRow}>
            {row.map(key => (
              <button
                key={key}
                style={styles.key}
                onClick={() => handleKeyPress(key)}
              >
                {shift ? key.toUpperCase() : key}
              </button>
            ))}
            {rowIndex === 1 && (
              <button style={styles.key} onClick={handleBackspace}>⌫</button>
            )}
          </div>
        ))}

        {/* Bottom Row */}
        <div style={styles.keyRow}>
          <button style={styles.specialKey} onClick={toLauncher}>123</button>
          <button style={styles.key} onClick={handleSpace}>space</button>
          <button style={styles.specialKey} onClick={toSuggestions}>🌐</button>
          <button style={styles.voiceKey} onClick={toVoiceMode}>🎤</button>
          <button style={styles.specialKey} onClick={toGenieMode}>🤖</button>
          <button style={styles.key} onClick={handleBackspace}>⏎</button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div style={styles.modeSwitcher}>
        <button style={styles.modeButton} onClick={toVoiceMode}>
          🎤 Voice
        </button>
        <button style={styles.modeButton} onClick={toGenieMode}>
          🤖 Genie
        </button>
        <button style={styles.modeButton} onClick={toLauncher}>
          🚀 Apps
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
  },
  predictionRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  prediction: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '16px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  inputDisplay: {
    background: '#2C2C2E',
    borderRadius: '12px',
    padding: '12px 16px',
    minHeight: '48px',
    color: '#fff',
    fontSize: '16px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  placeholder: {
    color: '#666',
  },
  keyboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  keyRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
  },
  key: {
    background: '#3A3A3C',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    fontSize: '18px',
    minWidth: '32px',
    cursor: 'pointer',
  },
  specialKey: {
    background: '#636366',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    fontSize: '14px',
    minWidth: '48px',
    cursor: 'pointer',
  },
  voiceKey: {
    background: '#FF3B30',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    fontSize: '16px',
    minWidth: '48px',
    cursor: 'pointer',
  },
  modeSwitcher: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  modeButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '16px',
    padding: '8px 16px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

export default DefaultKeyboard;