/**
 * RAZO KEYBOARD - STATE 4: SUGGESTION CARDS
 * Shows Genie Briefs, smart cards when keyboard opens
 */

import React, { useState, useEffect } from 'react';
import { useKeyboard } from './Keyboard';

interface SuggestionCard {
  id: string;
  type: 'genie' | 'calendar' | 'relationship' | 'wallet' | 'travel' | 'business';
  title: string;
  subtitle?: string;
  icon: string;
  actions: { label: string; type: string; value: string }[];
}

export function SuggestionCards() {
  const { state, toDefault, toGenieMode } = useKeyboard();
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state === 'suggestions') {
      fetchSuggestions();
    }
  }, [state]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4651/api/suggestions/demo-user');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Fallback with mock data
      setSuggestions(mockSuggestions);
    }
    setLoading(false);
  };

  const handleAction = async (card: SuggestionCard, action: any) => {
    if (action.type === 'genie') {
      toGenieMode();
    } else if (action.type === 'deeplink') {
      // Open app via deep link
      window.open(action.value, '_blank');
    }
  };

  if (state !== 'suggestions') return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.icon}>💡</span>
          <span style={styles.title}>Genie Briefs</span>
        </div>
        <button style={styles.closeButton} onClick={toDefault}>✕</button>
      </div>

      {/* Search Bar */}
      <div style={styles.searchBar}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          style={styles.searchInput}
          placeholder="Search or type command..."
        />
      </div>

      {/* Cards */}
      <div style={styles.cardsContainer}>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : (
          suggestions.map(card => (
            <div key={card.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{card.icon}</span>
                <div style={styles.cardContent}>
                  <p style={styles.cardTitle}>{card.title}</p>
                  {card.subtitle && (
                    <p style={styles.cardSubtitle}>{card.subtitle}</p>
                  )}
                </div>
              </div>

              <div style={styles.cardActions}>
                {card.actions.slice(0, 2).map((action, i) => (
                  <button
                    key={i}
                    style={styles.actionButton}
                    onClick={() => handleAction(card, action)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <p style={styles.quickTitle}>Quick Actions</p>
        <div style={styles.quickGrid}>
          {['✈️ Flight', '🏨 Hotel', '🚗 Cab', '💰 Wallet'].map((action, i) => (
            <button key={i} style={styles.quickButton}>
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock data
const mockSuggestions: SuggestionCard[] = [
  {
    id: '1',
    type: 'relationship',
    title: "Rahul's birthday today!",
    subtitle: 'Send your wishes',
    icon: '🎂',
    actions: [
      { label: '🎉 Wish Now', type: 'genie', value: 'birthday' },
      { label: '📞 Call', type: 'deeplink', value: 'tel:123456' },
    ],
  },
  {
    id: '2',
    type: 'calendar',
    title: 'Meeting with Investor in 15 mins',
    subtitle: 'Zoom call - Join now',
    icon: '📅',
    actions: [
      { label: 'Join', type: 'deeplink', value: 'zoom://join' },
      { label: 'Prepare', type: 'genie', value: 'meeting-prep' },
    ],
  },
  {
    id: '3',
    type: 'wallet',
    title: '₹500 cashback expires today',
    subtitle: 'Use it before it expires!',
    icon: '💰',
    actions: [
      { label: '🛒 Use Now', type: 'deeplink', value: 'rezwallet://pay' },
    ],
  },
  {
    id: '4',
    type: 'travel',
    title: 'Flight check-in opens in 2 hrs',
    subtitle: 'Air India AI-456 • BLR → DEL',
    icon: '✈️',
    actions: [
      { label: '✅ Check In', type: 'deeplink', value: 'airzy://checkin' },
    ],
  },
];

const styles = {
  container: {
    background: '#1C1C1E',
    borderRadius: '20px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
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
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    background: '#2C2C2E',
    borderRadius: '12px',
    padding: '8px 12px',
    marginBottom: '12px',
  },
  searchIcon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  },
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  loading: {
    color: '#666',
    textAlign: 'center',
    padding: '20px',
  },
  card: {
    background: '#2C2C2E',
    borderRadius: '16px',
    padding: '12px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '8px',
  },
  cardIcon: {
    fontSize: '32px',
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
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  actionButton: {
    background: '#3A3A3C',
    border: 'none',
    borderRadius: '16px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  quickActions: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #3A3A3C',
  },
  quickTitle: {
    color: '#888',
    fontSize: '12px',
    marginBottom: '8px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  quickButton: {
    background: '#2C2C2E',
    border: 'none',
    borderRadius: '12px',
    padding: '8px',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
};

export default SuggestionCards;