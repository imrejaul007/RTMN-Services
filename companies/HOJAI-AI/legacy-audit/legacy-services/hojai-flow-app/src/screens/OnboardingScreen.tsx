/**
 * OnboardingScreen - First-time user experience
 *
 * Features:
 * - Welcome
 * - Permission requests
 * - Persona setup
 * - Hotkey configuration
 * - Quick demo
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    icon: 'chatbubbles',
    title: 'Welcome to Hojai',
    subtitle: 'Your voice-first AI companion that remembers, thinks, and acts for you.',
  },
  {
    id: 'permissions',
    icon: 'mic',
    title: 'Microphone Access',
    subtitle: 'Hojai needs microphone access to hear you speak.',
  },
  {
    id: 'persona',
    icon: 'person',
    title: 'Choose Your Voice',
    subtitle: 'How should Hojai sound? Professional, friendly, or something else?',
  },
  {
    id: 'hotkey',
    icon: 'keypad',
    title: 'Set Up Quick Access',
    subtitle: 'Press ⌥ + Space anywhere to open Hojai instantly.',
  },
  {
    id: 'demo',
    icon: 'play',
    title: 'Try It Now',
    subtitle: 'Tap the button below and say something!',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState('professional');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = (callback: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(1);
      callback();
    });
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      slideOut(() => setCurrentStep(currentStep + 1));
    } else {
      complete();
    }
  };

  const back = () => {
    if (currentStep > 0) {
      slideOut(() => setCurrentStep(currentStep - 1));
    }
  };

  const complete = async () => {
    // Save onboarding complete
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('default_persona', selectedPersona);
    onComplete();
  };

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: slideAnim,
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={step.icon as any} size={80} color="#6366F1" />
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.subtitle}>{step.subtitle}</Text>

        {/* Persona Selection */}
        {step.id === 'persona' && (
          <View style={styles.personaGrid}>
            {['professional', 'friendly', 'casual'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.personaOption,
                  selectedPersona === p && styles.personaOptionSelected,
                ]}
                onPress={() => setSelectedPersona(p)}
              >
                <Ionicons
                  name={p === 'professional' ? 'briefcase' : p === 'friendly' ? 'happy' : 'cafe'}
                  size={32}
                  color={selectedPersona === p ? '#FFF' : '#666'}
                />
                <Text
                  style={[
                    styles.personaLabel,
                    selectedPersona === p && styles.personaLabelSelected,
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Demo Button */}
        {step.id === 'demo' && (
          <TouchableOpacity style={styles.demoButton}>
            <Ionicons name="mic" size={24} color="#FFF" />
            <Text style={styles.demoButtonText}>Tap & Speak</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={back}>
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.nextButton} onPress={next}>
          <Text style={styles.nextButtonText}>
            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    backgroundColor: '#6366F1',
    width: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  personaGrid: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 16,
  },
  personaOption: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  personaOptionSelected: {
    backgroundColor: '#6366F1',
  },
  personaLabel: {
    fontSize: 13,
    color: '#666',
  },
  personaLabelSelected: {
    color: '#FFF',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 40,
    gap: 12,
  },
  demoButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 30,
    marginLeft: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
