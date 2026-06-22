/**
 * RAZO KEYBOARD - MAIN APP
 * All 6 states in one place
 */

import React from 'react';
import { KeyboardProvider, useKeyboard, StateIndicator } from './Keyboard';
import { DefaultKeyboard } from './DefaultKeyboard';
import { VoiceMode } from './VoiceMode';
import { SuggestionCards } from './SuggestionCards';
import { AppLauncher } from './AppLauncher';
import { ActionMode } from './ActionMode';
import { GenieMode } from './GenieMode';

function KeyboardContent() {
  const { state } = useKeyboard();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎹</span>
          <span style={styles.logoText}>RAZO Keyboard</span>
        </div>
        <StateIndicator />
      </div>

      {/* Keyboard State */}
      <div style={styles.stateLabel}>
        Current: <strong>{state.toUpperCase()}</strong>
      </div>

      {/* Keyboard Content */}
      <div style={styles.keyboardContainer}>
        {state === 'default' && <DefaultKeyboard />}
        {state === 'voice' && <VoiceMode />}
        {state === 'genie' && <GenieMode />}
        {state === 'suggestions' && <SuggestionCards />}
        {state === 'launcher' && <AppLauncher />}
        {state === 'action' && <ActionMode />}
      </div>

      {/* State Switcher (for demo) */}
      <div style={styles.switcher}>
        <p style={styles.switcherTitle}>Switch State:</p>
        <div style={styles.switcherButtons}>
          <StateButton state="default" label="Typing" />
          <StateButton state="voice" label="Voice" />
          <StateButton state="genie" label="Genie" />
          <StateButton state="suggestions" label="Suggestions" />
          <StateButton state="launcher" label="Launcher" />
          <StateButton state="action" label="Action" />
        </div>
      </div>
    </div>
  );
}

function StateButton({ state, label }: { state: string; label: string }) {
  const { transition } = useKeyboard() as any;

  return (
    <button
      style={styles.stateButton}
      onClick={() => transition(state)}
    >
      {label}
    </button>
  );
}

function GenieMode() {
  const { state, toDefault, toAction } = useKeyboard();
  const [input, setInput] = React.useState('');

  if (state !== 'genie') return null;

  return (
    <div style={styles.genieContainer}>
      {/* Header */}
      <div style={styles.genieHeader}>
        <div style={styles.genieAvatar}>🤖</div>
        <div style={styles.genieInfo}>
          <p style={styles.genieName}>Genie</p>
          <p style={styles.genieStatus}>Ready to help</p>
        </div>
        <button style={styles.closeBtn} onClick={toDefault}>✕</button>
      </div>

      {/* Input */}
      <div style={styles.genieInput}>
        <input
          style={styles.textInput}
          placeholder="Ask Genie anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button style={styles.sendBtn}>➤</button>
      </div>

      {/* Suggestions */}
      <div style={styles.genieSuggestions}>
        <p style={styles.suggestionTitle}>Quick Actions:</p>
        <div style={styles.suggestionGrid}>
          {[
            { icon: '📧', text: 'Write email' },
            { icon: '🎂', text: 'Birthday wish' },
            { icon: '📊', text: 'Generate report' },
            { icon: '✈️', text: 'Book flight' },
          ].map((item, i) => (
            <button key={i} style={styles.suggestionChip}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <button style={styles.actionBtn} onClick={toAction}>
        ⚡ Do It For Me
      </button>
    </div>
  );
}

export default function RAZOKeyboardApp() {
  return (
    <KeyboardProvider>
      <KeyboardContent />
    </KeyboardProvider>
  );
}

const styles = {
  container: {
    background: '#000',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px',
    marginBottom: '20px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  logoText: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
  },
  stateLabel: {
    color: '#666',
    fontSize: '12px',
    marginBottom: '12px',
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: '400px',
  },
  switcher: {
    marginTop: '20px',
    width: '100%',
    maxWidth: '400px',
  },
  switcherTitle: {
    color: '#888',
    fontSize: '12px',
    marginBottom: '8px',
  },
  switcherButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  stateButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  // Genie Mode
  genieContainer: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
  },
  genieHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  genieAvatar: {
    fontSize: '40px',
  },
  genieInfo: {
    flex: 1,
  },
  genieName: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  genieStatus: {
    color: '#34C759',
    fontSize: '12px',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: '#fff',
    cursor: 'pointer',
  },
  genieInput: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  textInput: {
    flex: 1,
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    background: '#007AFF',
    border: 'none',
    borderRadius: '12px',
    width: '48px',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
  },
  genieSuggestions: {
    marginBottom: '16px',
  },
  suggestionTitle: {
    color: '#888',
    fontSize: '12px',
    marginBottom: '8px',
  },
  suggestionGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  suggestionChip: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 14px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionBtn: {
    background: 'linear-gradient(135deg, #FF9500, #FF2D55)',
    border: 'none',
    borderRadius: '24px',
    padding: '14px 24px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
};