// ── React Native AI Chat Screen ─────────────────────────────────────────────────
// Full-screen chat screen component for React Native

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useAIChatRN, AIAppType, CustomerContext } from '../hooks/useAIChatRN';

export interface AIChatScreenProps {
  appType: AIAppType;
  industryCategory?: string;
  userId: string;
  merchantId?: string;
  customerContext?: CustomerContext;
  socketUrl: string;
  token?: string;
  themeColor?: string;
  headerTitle?: string;
  showSuggestions?: boolean;
  enableTransfer?: boolean;
  onClose?: () => void;
  onEscalate?: (data: { reason: string; department?: string }) => void;
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
}

export function AIChatScreen({
  appType,
  industryCategory,
  userId,
  merchantId,
  customerContext,
  socketUrl,
  token,
  themeColor = '#6366f1',
  headerTitle = 'AI Assistant',
  showSuggestions = true,
  enableTransfer = true,
  onClose,
  onEscalate,
  onAction,
}: AIChatScreenProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    messages,
    isTyping,
    isConnected,
    suggestions,
    sendMessage,
    selectSuggestion,
    transferToStaff,
    clearMessages,
    disconnect,
  } = useAIChatRN({
    userId,
    appType,
    industryCategory,
    merchantId,
    customerContext,
    socketUrl,
    token,
    autoConnect: true,
    onEscalate,
    onAction,
  });

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue('');
  }, [inputValue, sendMessage]);

  const handleClose = useCallback(() => {
    clearMessages();
    disconnect();
    onClose?.();
  }, [clearMessages, disconnect, onClose]);

  const handleTransfer = useCallback(() => {
    transferToStaff('User requested human help');
    onEscalate?.({ reason: 'User requested human help' });
  }, [transferToStaff, onEscalate]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={themeColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleClose}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerStatus}>
            {isConnected ? 'Online' : isTyping ? 'Typing...' : 'Connecting...'}
          </Text>
        </View>

        {enableTransfer && (
          <TouchableOpacity style={styles.transferButton} onPress={handleTransfer}>
            <Text style={styles.transferButtonText}>Transfer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Message */}
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeEmoji}>🤖</Text>
              <Text style={styles.welcomeTitle}>Hi, I'm your AI assistant</Text>
              <Text style={styles.welcomeSubtitle}>
                I can help you with bookings, orders, reservations, and more
              </Text>
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.sender === 'user' ? styles.userRow : styles.aiRow,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.sender === 'user'
                    ? [styles.userBubble, { backgroundColor: themeColor }]
                    : message.sender === 'staff'
                    ? styles.staffBubble
                    : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.sender === 'user' && styles.userMessageText,
                  ]}
                >
                  {message.content}
                </Text>

                {/* Show actions if present */}
                {message.metadata?.actions && message.metadata.actions.length > 0 && (
                  <View style={styles.actionsContainer}>
                    {message.metadata.actions.map((action, index) => (
                      <View key={index} style={styles.actionItem}>
                        <Text style={styles.actionLabel}>{action.type}:</Text>
                        <Text style={styles.actionText}>
                          {action.reason || JSON.stringify(action.data)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageRow, styles.aiRow]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <Text style={styles.messageText}>Typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsLabel}>Quick actions:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.suggestionChip, { borderColor: themeColor }]}
                  onPress={() => selectSuggestion(suggestion)}
                >
                  <Text style={[styles.suggestionText, { color: themeColor }]}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type your message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputValue.trim() ? themeColor : '#e5e7eb' },
            ]}
            onPress={handleSend}
            disabled={!inputValue.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '300',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  transferButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: {
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {},
  aiBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  staffBubble: {
    backgroundColor: '#dbeafe',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1f2937',
  },
  userMessageText: {
    color: 'white',
  },
  actionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  suggestionsContent: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    color: 'white',
  },
});

export default AIChatScreen;
