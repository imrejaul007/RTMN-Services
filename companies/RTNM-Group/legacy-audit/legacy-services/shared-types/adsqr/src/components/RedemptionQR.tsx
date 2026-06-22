'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface RedemptionQRProps {
  rewardId: string;
  rewardType: 'coin' | 'sample' | 'consultation' | 'gift';
  rewardName: string;
  expiresAt?: string;
  onScan?: (data: string) => void;
}

// QR code generation using a simple approach (for demo - in production use a proper library)
export default function RedemptionQR({
  rewardId,
  rewardType,
  rewardName,
  expiresAt,
  onScan,
}: RedemptionQRProps) {
  const [qrData, setQrData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateQRData();
  }, [rewardId]);

  const generateQRData = () => {
    setIsGenerating(true);

    // Generate QR data
    const data = JSON.stringify({
      type: 'redemption',
      rewardType,
      rewardId,
      rewardName,
      generatedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      app: 'adsqr',
      version: '1.0',
    });

    setQrData(data);
    setIsGenerating(false);
  };

  const qrCodeUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData)}`
    : '';

  const formatExpiry = () => {
    if (!expiresAt) return null;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return { text: 'Expired', isExpired: true };
    } else if (diffDays > 0) {
      return { text: `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`, isExpired: false };
    } else if (diffHours > 0) {
      return { text: `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`, isExpired: false };
    } else {
      return { text: 'Expiring soon', isExpired: false };
    }
  };

  const expiryInfo = formatExpiry();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      maxWidth: '320px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: getRewardColor(rewardType),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          {getRewardIcon(rewardType)}
        </div>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#1f2937',
        }}>
          {rewardName}
        </h3>
        <p style={{
          margin: '4px 0 0',
          fontSize: '13px',
          color: '#6b7280',
        }}>
          Show this QR code to redeem
        </p>
      </div>

      {/* QR Code */}
      <div style={{
        width: '200px',
        height: '200px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #e5e7eb',
        overflow: 'hidden',
      }}>
        {isGenerating ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px',
            }} />
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Generating...</p>
          </div>
        ) : (
          <Image
            src={qrCodeUrl}
            alt="Redemption QR Code"
            width={180}
            height={180}
            style={{
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback for when QR server is unavailable
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Reward ID */}
      <div style={{
        marginTop: '16px',
        padding: '10px 16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        width: '100%',
        textAlign: 'center',
      }}>
        <p style={{
          margin: 0,
          fontSize: '11px',
          color: '#6b7280',
          fontFamily: 'monospace',
        }}>
          {rewardId}
        </p>
      </div>

      {/* Expiry */}
      {expiryInfo && (
        <div style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: expiryInfo.isExpired ? '#fee2e2' : '#ecfdf5',
          borderRadius: '8px',
          width: '100%',
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: expiryInfo.isExpired ? '#dc2626' : '#059669',
            fontWeight: 500,
          }}>
            {expiryInfo.text}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        width: '100%',
      }}>
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#92400e',
          textAlign: 'center',
        }}>
          Present this QR code at the store counter. Staff will scan to verify and redeem your reward.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function getRewardColor(type: string): string {
  switch (type) {
    case 'coin':
      return '#fbbf24';
    case 'sample':
      return '#34d399';
    case 'consultation':
      return '#60a5fa';
    case 'gift':
      return '#f472b6';
    default:
      return '#6366f1';
  }
}

function getRewardIcon(type: string): React.ReactNode {
  switch (type) {
    case 'coin':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M9 9h6M9 15h6" />
        </svg>
      );
    case 'sample':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'consultation':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'gift':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      );
  }
}
