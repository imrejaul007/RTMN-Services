/**
 * RAZO KEYBOARD - STATE 6: ACTION MODE
 * "Do It For Me" - Genie executes actions
 */

import React, { useState } from 'react';
import { useKeyboard } from './Keyboard';

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  contact?: string;
  message?: string;
  actions: { label: string; icon: string; action: string }[];
}

export function ActionMode() {
  const { state, toDefault, toGenieMode } = useKeyboard();
  const [generating, setGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionItem | null>(null);

  const mockActions: ActionItem[] = [
    {
      id: 'birthday',
      title: 'Follow up with Ahmed',
      subtitle: 'Last contact 4 days ago',
      icon: '📧',
      actions: [
        { label: 'Send WhatsApp', icon: '💬', action: 'whatsapp' },
        { label: 'Draft Email', icon: '📧', action: 'email' },
        { label: 'Call', icon: '📞', action: 'call' },
      ],
    },
    {
      id: 'email',
      title: 'Draft email to client',
      subtitle: 'Regarding proposal',
      icon: '📧',
      message: 'Hi,\n\nJust following up regarding our recent discussion...\n\nRegards',
      actions: [
        { label: 'Send Email', icon: '📤', action: 'send' },
        { label: 'Edit', icon: '✏️', action: 'edit' },
        { label: 'Ask Genie', icon: '🤖', action: 'genie' },
      ],
    },
    {
      id: 'message',
      title: 'Quick message to Rahul',
      subtitle: 'Birthday wish',
      icon: '💬',
      message: 'Hey Rahul! 🎉 Happy birthday! Hope you have an amazing day! 🎈',
      actions: [
        { label: 'Send', icon: '📤', action: 'send' },
        { label: 'Edit', icon: '✏️', action: 'edit' },
      ],
    },
  ];

  const handleAction = async (action: ActionItem, actionType: string) => {
    setCurrentAction(action);
    setGenerating(true);

    if (actionType === 'genie') {
      toGenieMode();
      return;
    }

    // Simulate Genie executing action
    setTimeout(() => {
      setGenerating(false);
      // Show success or open app
      if (actionType === 'whatsapp') {
        window.open('whatsapp://send?text=' + encodeURIComponent(action.message || ''), '_blank');
      } else if (actionType === 'email') {
        window.open('mailto:?body=' + encodeURIComponent(action.message || ''), '_blank');
      }
    }, 1500);
  };

  if (state !== 'action') return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.icon}>⚡</span>
          <span style={styles.title}>Genie Actions</span>
        </div>
        <button style={styles.closeButton} onClick={toDefault}>✕</button>
      </div>

      {/* Genie Avatar */}
      <div style={styles.genieAvatar}>
        <span style={styles.avatarEmoji}>🤖</span>
        <div style={styles.avatarGlow} />
      </div>

      {/* Action Cards */}
      <div style={styles.actionsContainer}>
        {mockActions.map(action => (
          <div key={action.id} style={styles.actionCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>{action.icon}</span>
              <div style={styles.cardContent}>
                <p style={styles.cardTitle}>{action.title}</p>
                <p style={styles.cardSubtitle}>{action.subtitle}</p>
              </div>
            </div>

            {/* Generated Content Preview */}
            {action.message && (
              <div style={styles.messagePreview}>
                <p style={styles.messageText}>{action.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              {action.actions.map((btn, i) => (
                <button
                  key={i}
                  style={styles.actionBtn}
                  onClick={() => handleAction(action, btn.action)}
                  disabled={generating}
                >
                  <span>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Generating State */}
      {generating && (
        <div style={styles.generatingOverlay}>
          <div style={styles.generatingContent}>
            <div style={styles.spinner}>🤖</div>
            <p style={styles.generatingText}>
              {currentAction?.id === 'birthday'
                ? 'Genie is drafting your message...'
                : 'Genie is preparing your action...'}
            </p>
          </div>
        </div>
      )}

      {/* Ask Genie Button */}
      <button style={styles.askGenieButton} onClick={toGenieMode}>
        <span>🤖</span>
        <span>Ask Genie Anything</span>
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '20px',
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
  },
  closeButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  genieAvatar: {
    position: 'relative',
    width: '80px',
    height: '80px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: '48px',
    zIndex: 1,
  },
  avatarGlow: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #FF9500, #FF2D55)',
    borderRadius: '50%',
    opacity: 0.3,
    filter: 'blur(20px)',
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionCard: {
    background: '#2C2C2E',
    borderRadius: '16px',
    padding: '14px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '8px',
  },
  cardIcon: {
    fontSize: '28px',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    color: '#888',
    fontSize: '12px',
    margin: 0,
  },
  messagePreview: {
    background: '#3A3A3C',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '10px',
  },
  messageText: {
    color: '#fff',
    fontSize: '13px',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    background: '#3A3A3C',
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
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  generatingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    fontSize: '48px',
    animation: 'bounce 1s ease-in-out infinite',
  },
  generatingText: {
    color: '#fff',
    fontSize: '14px',
    margin: 0,
  },
  askGenieButton: {
    background: 'linear-gradient(135deg, #FF9500, #FF2D55)',
    border: 'none',
    borderRadius: '24px',
    padding: '14px 24px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

export default ActionMode;