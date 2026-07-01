/**
 * MagicWandButton - One-tap help button for React
 *
 * @example
 * ```tsx
 * import { MagicWandButton } from '@hojai/razor/components';
 *
 * <MagicWandButton
 *   razor={razor}
 *   userId="user-1"
 *   onHelp={(result) => console.log(result)}
 *   onExecute={(actionId) => handleAction(actionId)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { Razor } from '../src/v2';

export interface MagicWandButtonProps {
  razor: Razor | null;
  userId?: string;
  onHelp?: (result: unknown) => void;
  onExecute?: (actionId: string) => void;
  label?: string;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MagicWandButton({
  razor,
  userId,
  onHelp,
  onExecute,
  label = 'Help Me',
  icon = '✨',
  className = '',
  style = {},
}: MagicWandButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const handleClick = async () => {
    if (!razor) return;
    setLoading(true);
    try {
      const res = await razor.magic.help({ text: '', userId });
      setResult(res);
      onHelp?.(res);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = async (option: any) => {
    if (!razor) return;
    setLoading(true);
    try {
      await razor.magic.execute({ actionId: option.action || option.id, userId });
      onExecute?.(option.action || option.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`magic-wand-container ${className}`} style={style}>
      <button
        onClick={handleClick}
        disabled={loading || !razor}
        className="magic-wand-button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <span>{loading ? '⏳' : icon}</span>
        <span>{label}</span>
      </button>

      {result && (
        <div className="magic-results" style={{ marginTop: '12px' }}>
          {(result as any).options?.map((option: any, idx: number) => (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                margin: '4px 0',
                background: option.isRecommended ? '#e8f5e9' : '#f5f5f5',
                border: option.isRecommended ? '2px solid #4caf50' : '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span>{option.icon || '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{option.title}</div>
                {option.subtitle && (
                  <div style={{ fontSize: '12px', color: '#666' }}>{option.subtitle}</div>
                )}
              </div>
              {option.price && (
                <span style={{ fontWeight: 700, color: '#4caf50' }}>₹{option.price}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EmotionButtons ─────────────────────────────────────────────────

export interface EmotionButtonsProps {
  razor: Razor | null;
  message: string;
  onAnalyze?: (result: unknown) => void;
  onReply?: (reply: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function EmotionButtons({
  razor,
  message,
  onAnalyze,
  onReply,
  className = '',
  style = {},
}: EmotionButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const analyze = async () => {
    if (!razor || !message) return;
    setLoading(true);
    try {
      const res = await razor.emotion.analyze({ message });
      setResult(res);
      onAnalyze?.(res);
    } finally {
      setLoading(false);
    }
  };

  const emotion = (result as any)?.emotion;
  const buttons = (result as any)?.buttons || [];
  const intensity = (result as any)?.intensity || 0;

  const emotionStyles: Record<string, { bg: string; icon: string; label: string }> = {
    anger: { bg: '#ffebee', icon: '😡', label: 'Calm This Down' },
    sadness: { bg: '#e3f2fd', icon: '💝', label: 'Say Something Nice' },
    confusion: { bg: '#fff8e1', icon: '🤔', label: 'What Should I Reply?' },
    urgency: { bg: '#fce4ec', icon: '⚡', label: 'Quick Reply' },
    happiness: { bg: '#e8f5e9', icon: '😊', label: 'Great!' },
    neutral: { bg: '#f5f5f5', icon: '💬', label: 'Reply' },
  };

  const style2 = emotionStyles[emotion] || emotionStyles.neutral;

  return (
    <div className={`emotion-buttons-container ${className}`} style={style}>
      {!result ? (
        <button
          onClick={analyze}
          disabled={loading || !razor || !message}
          style={{
            padding: '10px 16px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Analyzing...' : '🔍 Detect Emotion'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: style2.bg,
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '20px' }}>{style2.icon}</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{emotion}</span>
            <span style={{ fontSize: '12px', color: '#666' }}>({Math.round(intensity * 100)}%)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {buttons.map((btn: any, idx: number) => (
              <button
                key={idx}
                onClick={() => onReply?.(btn.replies?.[0] || '')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: style2.bg,
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PhotoCapture ──────────────────────────────────────────────────

export interface PhotoCaptureProps {
  razor: Razor | null;
  userId?: string;
  photoType: 'receipt' | 'order' | 'menu' | 'business_card' | 'document' | 'product' | 'price_tag' | 'screenshot';
  onAnalyze?: (result: unknown) => void;
  onAction?: (action: string, data: unknown) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function PhotoCapture({
  razor,
  userId,
  photoType,
  onAnalyze,
  onAction,
  className = '',
  style = {},
}: PhotoCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [image, setImage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImage(base64);

      if (!razor) return;
      setLoading(true);
      try {
        const res = await razor.photo.analyze({ imageData: base64, photoType, userId });
        setResult(res);
        onAnalyze?.(res);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const photoLabels: Record<string, { icon: string; label: string }> = {
    receipt: { icon: '🧾', label: 'Receipt' },
    order: { icon: '📦', label: 'Order' },
    menu: { icon: '🍽️', label: 'Menu' },
    business_card: { icon: '💼', label: 'Business Card' },
    document: { icon: '📄', label: 'Document' },
    product: { icon: '🏷️', label: 'Product' },
    price_tag: { icon: '🏷️', label: 'Price Tag' },
    screenshot: { icon: '📱', label: 'Screenshot' },
  };

  const label = photoLabels[photoType] || { icon: '📷', label: 'Photo' };

  return (
    <div className={`photo-capture-container ${className}`} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: '#667eea',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
        }}>
          <span>{label.icon}</span>
          <span>Upload {label.label}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
        {loading && <span>Processing...</span>}
      </div>

      {image && (
        <img
          src={image}
          alt="Uploaded"
          style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '12px' }}
        />
      )}

      {result && (
        <div style={{
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
            📊 {(result as any).summary}
          </div>
          {(result as any).data && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              {Object.entries((result as any).data).slice(0, 5).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {(result as any).actions?.map((action: any, idx: number) => (
              <button
                key={idx}
                onClick={() => onAction?.(action.id, result)}
                style={{
                  padding: '6px 12px',
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MomModeUI ──────────────────────────────────────────────────────

export interface MomModeUIProps {
  razor: Razor | null;
  onAction?: (actionId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function MomModeUI({
  razor,
  onAction,
  className = '',
  style = {},
}: MomModeUIProps) {
  const [buttons, setButtons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!razor) return;
    razor.modes.momMode().then(res => {
      setButtons((res as any).buttons || []);
      setLoading(false);
    });
  }, [razor]);

  if (loading) return <div>Loading...</div>;

  const buttonStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    minWidth: '80px',
    gap: '4px',
  };

  return (
    <div
      className={`mom-mode-ui ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        ...style,
      }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onAction?.(btn.id)}
          style={buttonStyle}
        >
          <span style={{ fontSize: '24px' }}>{btn.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 500 }}>{btn.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── NegotiationUI ─────────────────────────────────────────────────

export interface NegotiationUIProps {
  razor: Razor | null;
  userId?: string;
  initialItem: string;
  initialPrice: number;
  onComplete?: (result: unknown) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function NegotiationUI({
  razor,
  userId,
  initialItem,
  initialPrice,
  onComplete,
  className = '',
  style = {},
}: NegotiationUIProps) {
  const [negotiation, setNegotiation] = useState<any>(null);
  const [offer, setOffer] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const start = async () => {
    if (!razor) return;
    setLoading(true);
    try {
      const res = await razor.negotiation.start({
        sellerPrice: initialPrice,
        item: initialItem,
        userId,
      });
      setNegotiation(res);
    } finally {
      setLoading(false);
    }
  };

  const counter = async () => {
    if (!razor || !negotiation || !offer) return;
    setLoading(true);
    try {
      const res = await razor.negotiation.counter({
        negotiationId: negotiation.negotiationId,
        yourOffer: Number(offer),
      });
      setStatus(res.status);
      if (res.status === 'agreed') {
        onComplete?.(res);
      }
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!razor || !negotiation) return;
    setLoading(true);
    try {
      const res = await razor.negotiation.accept(negotiation.negotiationId);
      setStatus('accepted');
      onComplete?.(res);
    } finally {
      setLoading(false);
    }
  };

  const walkAway = async () => {
    if (!razor || !negotiation) return;
    setLoading(true);
    try {
      await razor.negotiation.walkAway(negotiation.negotiationId);
      setStatus('walked_away');
    } finally {
      setLoading(false);
    }
  };

  if (!negotiation) {
    return (
      <div className={className} style={style}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 600 }}>Seller wants: ₹{initialPrice}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>for: {initialItem}</div>
        </div>
        <button
          onClick={start}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Starting...' : '💰 Start Negotiating'}
        </button>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Your offer: ₹{negotiation.currentOffer}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Round {negotiation.round}/{negotiation.maxRounds}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Target: ₹{negotiation.targetSavings}% off</div>
          {negotiation.sellerCounterOffer && (
            <div style={{ color: '#f44336' }}>Seller: ₹{negotiation.sellerCounterOffer}</div>
          )}
        </div>
      </div>

      {status === 'agreed' || status === 'accepted' ? (
        <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
          🎉 Deal! Final price: ₹{negotiation.sellerCounterOffer || negotiation.currentOffer}
        </div>
      ) : status === 'walked_away' ? (
        <div style={{ padding: '16px', background: '#ffebee', borderRadius: '8px', textAlign: 'center' }}>
          🚶 You walked away
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="number"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="Your offer..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
              }}
            />
            <button
              onClick={counter}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Counter
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={accept}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ✅ Accept
            </button>
            <button
              onClick={walkAway}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              🚶 Walk Away
            </button>
          </div>
        </>
      )}
    </div>
  );
}
