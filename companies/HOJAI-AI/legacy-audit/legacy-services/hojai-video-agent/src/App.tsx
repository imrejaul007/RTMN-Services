'use client';

import { useState, useRef, useEffect } from 'react';

// Types
interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface Avatar {
  name: string;
  voice: string;
  style: 'professional' | 'friendly' | 'formal';
  image: string;
}

// Avatars
const AVATARS: Avatar[] = [
  { name: 'Priya', voice: 'alluka', style: 'friendly', image: '👩‍💼' },
  { name: 'Arjun', voice: 'arjun', style: 'professional', image: '👨‍💼' },
  { name: 'Sara', voice: 'sara', style: 'formal', image: '👩‍🔬' }
];

// Demo responses
const RESPONSES = [
  "Hello! I'm Priya, your virtual assistant. How can I help you today?",
  "Great question! Let me help you with that. Our most popular service is the AI Receptionist which handles calls 24/7.",
  "I can help you book appointments, answer questions, and even process orders through voice!",
  "Absolutely! We support multiple languages including Hindi, Tamil, and English.",
  "Let me connect you with our sales team for a personalized demo.",
  "Our AI employees can handle customer support, lead qualification, and even collections!",
  "That's a fantastic idea! Many businesses use our AI receptionist to save 40% on support costs.",
  "I can show you our dashboard where you'll see real-time call analytics and customer insights."
];

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [avatar] = useState(AVATARS[0]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [showBubble, setShowBubble] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing/speaking
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'agent') {
      setIsSpeaking(true);
      const timer = setTimeout(() => setIsSpeaking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleStart = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowBubble(false);

    // Initial greeting
    setTimeout(() => {
      addMessage('agent', `Hello! I'm ${avatar.name}, your AI assistant. I can help you with customer support, bookings, and more! What can I help you with?`);
    }, 500);
  };

  const addMessage = (role: 'user' | 'agent', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const handleSend = () => {
    if (!currentMessage.trim()) return;

    // Add user message
    addMessage('user', currentMessage);
    const userInput = currentMessage;
    setCurrentMessage('');

    // Simulate agent response
    setTimeout(() => {
      const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
      addMessage('agent', response);
    }, 1000);
  };

  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      handleSend();
    } else {
      setIsListening(true);
      // Simulate listening
      setTimeout(() => {
        setIsListening(false);
        const phrases = [
          "Book a table for 4",
          "What services do you offer?",
          "Connect me to sales",
          "Show me your pricing"
        ];
        setCurrentMessage(phrases[Math.floor(Math.random() * phrases.length)]);
        handleSend();
      }, 3000);
    }
  };

  // Bubble styles
  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: isMinimized ? 64 : 400,
    transition: 'all 0.3s ease',
    zIndex: 9999
  };

  // Expanded window styles
  const windowStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    height: isExpanded ? 600 : 400
  };

  // FAB styles
  const fabStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.5)',
    fontSize: 28,
    transition: 'transform 0.2s'
  };

  // Notification badge
  if (showBubble && !isMinimized) {
    return (
      <div style={bubbleStyle}>
        <div style={windowStyle}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{ fontSize: 40 }}>{avatar.image}</div>
            <div style={{ flex: 1, color: 'white' }}>
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>{avatar.name}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>AI Assistant</div>
            </div>
            <button
              onClick={() => { setIsMinimized(true); setShowBubble(true); }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: 8, borderRadius: 8, cursor: 'pointer' }}
            >
              −
            </button>
          </div>

          {/* Avatar Display */}
          <div style={{
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 150
          }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: isSpeaking
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              transition: 'all 0.3s'
            }}>
              {isSpeaking ? '🔊' : avatar.image}
            </div>
            <div style={{
              marginTop: 12,
              fontSize: 14,
              color: isSpeaking ? '#22c55e' : '#64748b'
            }}>
              {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready to help'}
            </div>
            {isSpeaking && (
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#8b5cf6',
                      animation: `bounce 1s infinite ${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 16
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#8b5cf6' : '#f1f5f9',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  fontSize: 14
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: 16,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: 8
          }}>
            <input
              type="text"
              value={currentMessage}
              onChange={e => setCurrentMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 24,
                border: '1px solid #e2e8f0',
                outline: 'none',
                fontSize: 14
              }}
            />
            <button
              onClick={handleMicClick}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: isListening ? '#22c55e' : '#8b5cf6',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s'
              }}
            >
              {isListening ? '🔊' : '🎤'}
            </button>
            <button
              onClick={handleSend}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#8b5cf6',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimized FAB
  if (isMinimized) {
    return (
      <div style={bubbleStyle}>
        <button style={fabStyle} onClick={handleStart}>
          💬
        </button>
      </div>
    );
  }

  return null;
}
