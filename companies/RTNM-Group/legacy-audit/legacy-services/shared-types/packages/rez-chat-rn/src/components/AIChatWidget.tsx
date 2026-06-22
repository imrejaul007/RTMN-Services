// ── React Native AI Chat Widget ─────────────────────────────────────────────────
// Mobile-optimized AI chat component for React Native apps

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
  Animated,
  Dimensions,
} from 'react-native';
import { useAIChatRN, AIAppType, CustomerContext } from '../hooks/useAIChatRN';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AIChatWidgetProps {
  appType: AIAppType;
  industryCategory?: string;
  userId: string;
  merchantId?: string;
  customerContext?: CustomerContext;
  socketUrl: string;
  token?: string;
  position?: 'bottom-right' | 'bottom-left';
  themeColor?: string;
  showSuggestions?: boolean;
  enableTransfer?: boolean;
  onEscalate?: (data: { reason: string; department?: string }) => void;
  onAction?: (action: { type: string; data: Record<string, unknown> }) => void;
}

export function AIChatWidget({
  appType,
  industryCategory,
  userId,
  merchantId,
  customerContext,
  socketUrl,
  token,
  position = 'bottom-right',
  themeColor = '#6366f1',
  showSuggestions = true,
  enableTransfer = true,
  onEscalate,
  onAction,
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const {
    messages,
    isTyping,
    isConnected,
    suggestions,
    sendMessage,
    selectSuggestion,
    transferToStaff,
    endChat,
    clearMessages,
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
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, scaleAnim]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue('');
  }, [inputValue, sendMessage]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleTransfer = useCallback(() => {
    transferToStaff('User requested human help');
    onEscalate?.({ reason: 'User requested human help' });
  }, [transferToStaff, onEscalate]);

  const chatTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const chatOpacity = slideAnim;

  const buttonScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const isBottomRight = position === 'bottom-right';

  return (
    <View style={[styles.container, isBottomRight ? styles.containerRight : styles.containerLeft]}>
      {/* Chat Window */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatWindow,
            {
              transform: [{ translateY: chatTranslateY }],
              opacity: chatOpacity,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: themeColor }]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerStatus}>
                {isConnected ? 'Online' : isTyping ? 'Typing...' : 'Connecting...'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {enableTransfer && (
                <TouchableOpacity
                  style={styles.transferButton}
                  onPress={handleTransfer}
                >
                  <Text style={styles.transferButtonText}>Transfer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <KeyboardAvoidingView
            style={styles.messagesContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
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
        </Animated.View>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: themeColor }]}
            onPress={toggleChat}
            activeOpacity={0.8}
          >
            <Text style={styles.chatButtonText}>💬</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    zIndex: 9999,
  },
  containerRight: {
    right: 20,
  },
  containerLeft: {
    left: 20,
  },
  chatButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  chatButtonText: {
    fontSize: 24,
  },
  chatWindow: {
    width: SCREEN_WIDTH - 40,
    height: 520,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  transferButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 8,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {},
  aiBubble: {
    backgroundColor: '#f3f4f6',
  },
  staffBubble: {
    backgroundColor: '#dbeafe',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1f2937',
  },
  userMessageText: {
    color: 'white',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    color: 'white',
  },
});

export default AIChatWidget;
