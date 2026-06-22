/**
 * OverlayScreen - Magical Voice Interface
 *
 * Features:
 * - Live streaming transcripts
 * - Auto intent detection (no manual mode selection)
 * - Real-time action feedback
 * - Smart suggestions
 * - Personal style learning
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFlowStore } from '../store/flowStore';
import { streamingVoice } from '../services/streamingVoice';
import { intentDetector, FlowMode } from '../services/intentDetection';
import { executeFlow } from '../services/flowApi';

const { width, height } = Dimensions.get('window');

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  icon: string;
}

export default function OverlayScreen() {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [detectedIntent, setDetectedIntent] = useState<{ mode: FlowMode; confidence: number } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  const { messages, addMessage, hideOverlay } = useFlowStore();

  // Subscribe to voice state
  useEffect(() => {
    const unsubscribe = streamingVoice.subscribe((state) => {
      if (state.partialTranscript) {
        setInput(state.partialTranscript);
        // Detect intent in real-time
        if (state.partialTranscript.length > 3) {
          const intent = intentDetector.detect(state.partialTranscript);
          setDetectedIntent({ mode: intent.mode, confidence: intent.confidence });
          setSuggestions(intent.suggestions || []);
        }
      }
      setIsListening(state.isListening);
      setIsProcessing(state.isProcessing);
    });

    return unsubscribe;
  }, []);

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Handle voice press
  const handleVoicePress = useCallback(async () => {
    if (isListening) {
      // Stop recording
      setProcessingSteps([
        { id: '1', label: 'Processing...', status: 'active', icon: 'ellipsis' },
      ]);

      const transcript = await streamingVoice.stopListening();
      setInput(transcript);

      if (transcript.trim()) {
        await processInput(transcript);
      }
    } else {
      // Start recording
      setProcessingSteps([]);
      setDetectedIntent(null);
      setSuggestions([]);
      await streamingVoice.startListening();
    }
  }, [isListening]);

  // Process input with intent
  const processInput = async (text: string) => {
    setIsProcessing(true);

    // Detect intent
    const intent = intentDetector.detect(text);
    setDetectedIntent({ mode: intent.mode, confidence: intent.confidence });
    setSuggestions(intent.suggestions || []);

    // Show processing steps
    const steps: ProcessingStep[] = [
      { id: '1', label: 'Analyzing...', status: 'active', icon: 'search' },
    ];

    if (intent.mode === 'execute') {
      steps.push({ id: '2', label: 'Executing action', status: 'pending', icon: 'flash' });
    } else if (intent.mode === 'remember') {
      steps.push({ id: '2', label: 'Storing memory', status: 'pending', icon: 'bookmark' });
    } else if (intent.mode === 'delegate') {
      steps.push({ id: '2', label: 'Delegating', status: 'pending', icon: 'people' });
    } else {
      steps.push({ id: '2', label: 'Generating response', status: 'pending', icon: 'chatbubbles' });
    }

    setProcessingSteps(steps.map((s, i) => ({ ...s, status: i === 0 ? 'done' : 'pending' })));

    try {
      // Add user message
      addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: text,
        mode: intent.mode,
        timestamp: new Date(),
        status: 'done',
      });

      // Execute flow
      const response = await executeFlow({
        input: text,
        mode: intent.mode,
        userId: 'current_user',
      });

      // Show completion
      setProcessingSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));

      // Add assistant response
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.output,
        mode: intent.mode,
        timestamp: new Date(),
        status: 'done',
      });

      setTimeout(() => {
        setProcessingSteps([]);
        setDetectedIntent(null);
        setSuggestions([]);
      }, 1000);

    } catch (error) {
      console.error('Flow execution failed:', error);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        mode: intent.mode,
        timestamp: new Date(),
        status: 'error',
      });
      setProcessingSteps([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text submit
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isProcessing) return;
    await processInput(input);
    setInput('');
  }, [input, isProcessing]);

  // Handle suggestion press
  const handleSuggestionPress = useCallback((suggestion: string) => {
    setInput((prev) => prev + suggestion);
  }, []);

  // Close overlay
  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: height, duration: 200, useNativeDriver: true }),
    ]).start(() => hideOverlay());
  }, [fadeAnim, slideAnim, hideOverlay]);

  return (
    <View style={styles.container}>
      {/* Background */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Main overlay */}
      <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Ionicons name="sparkles" size={16} color="#6366F1" />
                </View>
                <Text style={styles.logoText}>Hojai</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Intent Detection Badge */}
            {detectedIntent && (
              <View style={styles.intentBadge}>
                <View style={styles.intentInfo}>
                  <Text style={styles.intentLabel}>Detected:</Text>
                  <Text style={styles.intentMode}>
                    {detectedIntent.mode.charAt(0).toUpperCase() + detectedIntent.mode.slice(1)}
                  </Text>
                  <Text style={styles.intentConfidence}>
                    {Math.round(detectedIntent.confidence * 100)}%
                  </Text>
                </View>
                <View style={styles.intentDot}>
                  <View style={styles.pulsingDot} />
                </View>
              </View>
            )}

            {/* Processing Steps */}
            {processingSteps.length > 0 && (
              <View style={styles.processingContainer}>
                {processingSteps.map((step, index) => (
                  <View key={step.id} style={styles.processingStep}>
                    <Ionicons
                      name={step.status === 'done' ? 'checkmark-circle' :
                        step.status === 'active' ? 'ellipsis' : 'ellipse-outline'}
                      size={16}
                      color={step.status === 'done' ? '#10B981' :
                        step.status === 'active' ? '#6366F1' : '#666'}
                    />
                    <Text style={[
                      styles.processingLabel,
                      step.status === 'active' && styles.processingLabelActive
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Messages */}
            <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
              {messages.slice(-3).map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.content}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Suggestions */}
            {suggestions.length > 0 && !isProcessing && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && styles.voiceButtonRecording,
                  isProcessing && styles.voiceButtonProcessing,
                ]}
                onPress={handleVoicePress}
                disabled={isProcessing}
              >
                <Ionicons
                  name={isListening ? 'stop' : 'mic'}
                  size={24}
                  color="#FFF"
                />
                {isListening && <View style={styles.recordingPulse} />}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={isListening ? 'Listening...' : 'Speak or type...'}
                placeholderTextColor="#666"
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                editable={!isProcessing}
              />

              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSubmit}
                disabled={!input.trim() || isProcessing}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={input.trim() && !isProcessing ? '#6366F1' : '#666'}
                />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <QuickAction icon="flash" label="Do" onPress={() => setInput('Schedule meeting tomorrow at ')} />
              <QuickAction icon="chatbubbles" label="Draft" onPress={() => setInput('Draft email to ')} />
              <QuickAction icon="bookmark" label="Remember" onPress={() => setInput('Remember that ')} />
              <QuickAction icon="search" label="Find" onPress={() => setInput('Find ')} />
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Animated.View>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon as any} size={16} color="#6366F1" />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: height * 0.85, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  blurContainer: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  closeButton: { padding: 8 },
  intentBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  intentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intentLabel: { fontSize: 12, color: '#666' },
  intentMode: { fontSize: 14, fontWeight: '600', color: '#6366F1' },
  intentConfidence: { fontSize: 12, color: '#10B981' },
  intentDot: { width: 12, height: 12 },
  pulsingDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366F1',
  },
  processingContainer: { marginBottom: 12, gap: 8 },
  processingStep: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processingLabel: { fontSize: 14, color: '#666' },
  processingLabelActive: { color: '#6366F1', fontWeight: '500' },
  messagesContainer: { flex: 1, marginBottom: 12 },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#6366F1', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: 'rgba(255, 255, 255, 0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  suggestionChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  suggestionText: { fontSize: 13, color: '#6366F1' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 16,
  },
  voiceButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1',
    justifyContent: 'center', alignItems: 'center',
  },
  voiceButtonRecording: { backgroundColor: '#EF4444' },
  voiceButtonProcessing: { backgroundColor: '#666' },
  recordingPulse: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#EF4444',
  },
  input: { flex: 1, color: '#FFF', fontSize: 16, paddingHorizontal: 12, paddingVertical: 12, maxHeight: 100 },
  sendButton: { padding: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around' },
  quickAction: { alignItems: 'center', gap: 4, padding: 8 },
  quickActionLabel: { color: '#6366F1', fontSize: 11, fontWeight: '500' },
});
