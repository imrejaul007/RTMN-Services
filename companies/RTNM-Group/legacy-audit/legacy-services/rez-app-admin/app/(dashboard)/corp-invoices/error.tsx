/**
 * Error Boundary for Corp Invoices Section
 * Catches errors in the corp-invoices route group
 */

'use client';

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

interface ErrorBoundaryProps {
  error: Error;
  resetError: () => void;
}

export default function CorpInvoicesError({ error, resetError }: ErrorBoundaryProps) {
  const router = useRouter();

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={64} color={Colors.light.error} />
        </View>

        <Text style={styles.title}>Unable to Load Invoices</Text>
        <Text style={styles.message}>
          Something went wrong while loading invoice data. Please try again.
        </Text>

        <View style={styles.errorInfo}>
          <Text style={styles.errorText}>
            {__DEV__ && error.message}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={resetError}
            accessibilityLabel="Retry loading invoices"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleGoBack}
            accessibilityLabel="Go back to previous page"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.light.primary} />
            <Text style={[styles.buttonText, styles.backButtonText]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.light.gray700,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorInfo: {
    backgroundColor: Colors.light.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.light.gray600,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
  },
  backButton: {
    backgroundColor: Colors.light.gray100,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: Colors.light.primary,
  },
});
