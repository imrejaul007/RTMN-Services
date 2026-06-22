import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { showAlert } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { withErrorBoundary } from '../../components/ErrorBoundary';

// BUG-015 FIX: Client-side brute-force protection.
// Tracks failed login attempts and locks the login button for 15 minutes
// after 5 consecutive failures. Resets on successful login.
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function LoginScreenInner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // A10-L2 FIX: Inline error message instead of jarring modal alert
  const [loginError, setLoginError] = useState<string | null>(null);

  // BUG-015 FIX: Track failed attempts and lockout state.
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Countdown ticker during lockout so the UI shows a live "try again in X:XX".
  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        setLockoutUntil(null);
        setAttemptCount(0);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const formatLockoutTime = (ms: number): string => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleLogin = useCallback(async () => {
    // BUG-015 FIX: Reject if locked out.
    if (isLockedOut) {
      showAlert(
        'Account Locked',
        `Too many failed attempts. Try again in ${formatLockoutTime(lockoutRemaining)}.`
      );
      return;
    }

    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Please enter email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setLoginError(null);
    try {
      await login(email.trim(), password);
      // BUG-015 FIX: Reset attempt count on successful login.
      setAttemptCount(0);
      setLockoutUntil(null);
      router.replace('/(dashboard)');    } catch (error: any) {
      // BUG-015 FIX: Increment attempt count and apply lockout if threshold reached.
      // A10-L2 FIX: Show inline error below form for better UX (combined with lockout).
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      const msg = error?.message || '';
      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        showAlert(
          'Account Locked',
          `Too many failed attempts. You have been locked out for 15 minutes.`
        );
      } else {
        const remaining = MAX_ATTEMPTS - newCount;
        if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setLoginError(`Network error. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`);
        } else {
          setLoginError(`${msg || 'Invalid credentials'}. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isLockedOut, lockoutRemaining, attemptCount, login]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Rez Admin</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>HQ Administration Portal</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email Address"
              placeholderTextColor={colors.icon}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.icon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Password"
              placeholderTextColor={colors.icon}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>

          {/* A10-L2 FIX: Inline error message — dismissible, replaces jarring modal */}
          {loginError && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{loginError}</Text>
              <TouchableOpacity onPress={() => setLoginError(null)} style={{ marginLeft: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.light.card} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Admin access only. Unauthorized access is prohibited.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    justifyContent: 'center',
    minHeight: '100%',
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  logoImage: {
    width: 160,
    height: 86,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.slate,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  // A10-L2 FIX: Inline error banner styles
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  loginButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.light.card,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

// ADM-004: Wrap with per-screen ErrorBoundary so a login crash doesn't propagate
// to the root ErrorBoundary and take down the entire app.
export default withErrorBoundary(LoginScreenInner, { name: 'LoginScreen' });
