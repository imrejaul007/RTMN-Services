/**
 * SupportChat - Live chat and ticket creation widget
 */

import * as React from 'react';

interface Message {
  id: string;
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  content: string;
  timestamp: string;
}

interface SupportChatProps {
  apiKey: string;
  companyId: string;
  sessionId?: string;
  apiBaseUrl?: string;
  onTicketCreated?: (ticketId: string) => void;
  className?: string;
}

export const SupportChat: React.FC<SupportChatProps> = ({
  apiKey,
  companyId,
  sessionId,
  apiBaseUrl = 'http://localhost:5482',
  onTicketCreated,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'chat' | 'ticket'>('chat');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [customerInfo, setCustomerInfo] = React.useState({ name: '', email: '' });
  const [showInfoForm, setShowInfoForm] = React.useState(true);
  const [ticketId, setTicketId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Company-Id': companyId,
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = async () => {
    if (!customerInfo.name || !customerInfo.email) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: sessionId || `cust_${Date.now()}`,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
        }),
      });
      const data = await res.json();
      setTicketId(data.session.sessionId);
      setShowInfoForm(false);
      setMessages([
        {
          id: '1',
          sender: 'agent',
          senderName: 'Support Bot',
          content: `Hi ${customerInfo.name}! Welcome to support. How can I help you today?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Failed to start chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !ticketId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'customer',
      senderName: customerInfo.name,
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Send to API
    try {
      await fetch(`${apiBaseUrl}/api/sessions/${ticketId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender: 'customer',
          senderName: customerInfo.name,
          content: input,
        }),
      });

      // Auto-reply after delay
      setTimeout(() => {
        const replies = [
          'Thanks for your message! Let me check that for you.',
          'I understand. Could you provide more details?',
          'I\'m looking into this right now.',
          'That\'s a great question! Here\'s what I found...',
        ];
        const autoReply: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          senderName: 'Support Bot',
          content: replies[Math.floor(Math.random() * replies.length)],
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, autoReply]);
      }, 1500);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleCreateTicket = async (subject: string, description: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId: sessionId || `cust_${Date.now()}`,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          subject,
          description,
          source: 'widget',
        }),
      });
      const data = await res.json();
      setTicketId(data.ticket.ticketId);
      onTicketCreated?.(data.ticket.ticketId);
      setMessages([
        {
          id: '1',
          sender: 'system',
          senderName: 'System',
          content: `Ticket #${data.ticket.ticketId.slice(0, 8)} created. We'll get back to you soon!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        className={`hojai-support-button ${className}`}
        style={styles.floatingButton}
        onClick={() => setIsOpen(true)}
      >
        💬
        <span style={styles.badge}>Support</span>
      </button>
    );
  }

  return (
    <div style={styles.container} className={className}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <span style={styles.headerTitle}>Support</span>
          <span style={styles.headerStatus}>● Online</span>
        </div>
        <button style={styles.closeButton} onClick={() => setIsOpen(false)}>✕</button>
      </div>

      {/* Mode Toggle */}
      <div style={styles.modeToggle}>
        <button
          style={{ ...styles.modeButton, ...(mode === 'chat' ? styles.modeButtonActive : {}) }}
          onClick={() => setMode('chat')}
        >
          💬 Chat
        </button>
        <button
          style={{ ...styles.modeButton, ...(mode === 'ticket' ? styles.modeButtonActive : {}) }}
          onClick={() => setMode('ticket')}
        >
          🎫 Ticket
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {showInfoForm ? (
          <div style={styles.infoForm}>
            <p style={styles.infoText}>Please enter your details to start a conversation.</p>
            <input
              type="text"
              placeholder="Your Name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Your Email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              style={styles.input}
            />
            <button
              style={styles.primaryButton}
              onClick={handleStartChat}
              disabled={!customerInfo.name || !customerInfo.email || loading}
            >
              {loading ? 'Starting...' : 'Start Chat'}
            </button>
          </div>
        ) : mode === 'chat' ? (
          <>
            {/* Messages */}
            <div style={styles.messages}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    ...(msg.sender === 'customer' ? styles.customerMessage : {}),
                    ...(msg.sender === 'system' ? styles.systemMessage : {}),
                  }}
                >
                  <span style={styles.senderName}>{msg.senderName}</span>
                  <p style={styles.messageText}>{msg.content}</p>
                  <span style={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                style={styles.input}
              />
              <button style={styles.sendButton} onClick={handleSendMessage}>➤</button>
            </div>
          </>
        ) : (
          <TicketForm
            onSubmit={handleCreateTicket}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

interface TicketFormProps {
  onSubmit: (subject: string, description: string) => void;
  loading: boolean;
}

const TicketForm: React.FC<TicketFormProps> = ({ onSubmit, loading }) => {
  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;
    onSubmit(subject, description);
  };

  return (
    <form style={styles.ticketForm} onSubmit={handleSubmit}>
      <h3 style={styles.formTitle}>Create Support Ticket</h3>

      <div style={styles.formGroup}>
        <label style={styles.label}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={styles.select}
        >
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
          <option value="sales">Sales</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Subject *</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={styles.input}
          placeholder="Brief description of your issue"
          required
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Details</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
          placeholder="Provide more details about your issue..."
          rows={4}
        />
      </div>

      <button
        type="submit"
        style={styles.primaryButton}
        disabled={!subject || loading}
      >
        {loading ? 'Creating...' : 'Submit Ticket'}
      </button>
    </form>
  );
};

const styles: Record<string, React.CSSProperties> = {
  floatingButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#EF4444',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '380px',
    height: '550px',
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1E293B',
    borderBottom: '1px solid #334155',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  headerStatus: {
    fontSize: '12px',
    color: '#22C55E',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '18px',
    cursor: 'pointer',
  },
  modeToggle: {
    display: 'flex',
    backgroundColor: '#1E293B',
    padding: '8px',
    gap: '8px',
  },
  modeButton: {
    flex: 1,
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: '13px',
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
    color: 'white',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  infoForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    justifyContent: 'center',
    height: '100%',
  },
  infoText: {
    color: '#94A3B8',
    fontSize: '14px',
    textAlign: 'center',
    margin: 0,
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '12px',
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
  },
  customerMessage: {
    backgroundColor: '#3B82F6',
    alignSelf: 'flex-end',
  },
  systemMessage: {
    backgroundColor: '#1E293B',
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94A3B8',
  },
  senderName: {
    fontSize: '11px',
    color: '#94A3B8',
    marginBottom: '4px',
  },
  messageText: {
    margin: 0,
    color: '#F1F5F9',
    fontSize: '14px',
    lineHeight: 1.4,
  },
  messageTime: {
    fontSize: '10px',
    color: '#64748B',
    marginTop: '4px',
    display: 'block',
    textAlign: 'right',
  },
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: '1px solid #334155',
    backgroundColor: '#1E293B',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  sendButton: {
    width: '44px',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
  },
  ticketForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    height: '100%',
    overflow: 'auto',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F1F5F9',
    margin: '0 0 8px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  select: {
    padding: '10px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
  },
  textarea: {
    padding: '10px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  primaryButton: {
    padding: '12px',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
};

export default SupportChat;