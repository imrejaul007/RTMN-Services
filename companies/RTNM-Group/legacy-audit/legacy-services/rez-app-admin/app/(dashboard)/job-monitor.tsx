import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';
import { socketService } from '../../services/socket';
import { s } from './styles/job-monitor.styles';

type JobStatus = 'healthy' | 'warning' | 'failing' | 'unknown';

interface Job {
  name: string;
  schedule: string;
  category: string;
  expectedIntervalMin: number;
  lastRun: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  status: JobStatus;
}

const STATUS_CONFIG: Record<JobStatus, { color: string; icon: string; label: string }> = {
  healthy: { color: '#22C55E', icon: 'checkmark-circle', label: 'Healthy' },
  warning: { color: '#F59E0B', icon: 'warning', label: 'Overdue' },
  failing: { color: '#EF4444', icon: 'close-circle', label: 'Failing' },
  unknown: { color: '#9CA3AF', icon: 'help-circle', label: 'No data' },
};

const CATEGORY_COLORS: Record<string, string> = {
  financial: '#7C3AED',
  bookings: '#2563EB',
  coins: '#D97706',
  marketing: '#059669',
  security: '#DC2626',
  operations: '#0891B2',
  gamification: '#7C3AED',
  billing: '#9333EA',
};

export default function JobMonitorScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [realtimeAlert, setRealtimeAlert] = useState<{ name: string; error: string } | null>(null);
  // PRIYA: Track triggering job to prevent double-tap
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await apiClient.get<{data?: unknown[]; jobs?: unknown[]}>(`/admin/system/jobs?ts=${Date.now()}`);
      setJobs((res.data?.data || res.data?.jobs || []) as unknown as Job[]);
    } catch (e) {
      logger.error('[JobMonitor] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // D21: Track the toast-dismiss timer so it gets cleared on unmount.
  // Previously `setTimeout(..., 5000)` was fired without a handle; if the
  // component unmounted within 5s the callback still ran and called
  // setRealtimeAlert on an unmounted component.
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);

    const unsubscribe = socketService.onJobFailure((data) => {
      setRealtimeAlert({ name: data.name, error: data.error });
      setJobs((prev) =>
        prev.map((j) =>
          j.name === data.name
            ? {
                ...j,
                consecutiveFailures: data.consecutiveFailures,
                status: 'failing',
                lastError: data.error,
              }
            : j
        )
      );
      // Clear any previous pending dismiss so rapid-fire failures don't stack.
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => {
        setRealtimeAlert(null);
        alertTimeoutRef.current = null;
      }, 5000);
    });

    return () => {
      clearInterval(interval);
      unsubscribe?.();
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [fetchJobs]);

  const categories = [...new Set(jobs.map((j) => j.category))];
  const filtered = selectedCategory ? jobs.filter((j) => j.category === selectedCategory) : jobs;

  const failingCount = jobs.filter((j) => j.status === 'failing').length;
  const warningCount = jobs.filter((j) => j.status === 'warning').length;

  const handleRunNow = async (job: Job) => {
    // PRIYA: Destructive action confirmation for manual job trigger
    const confirmed = await showConfirm(
      'Trigger Job',
      `Manually trigger "${job.name}" now? This executes background logic immediately.`
    );
    if (!confirmed) return;

    // PRIYA: Set loading state to prevent double-tap during API call
    setTriggeringJob(job.name);
    try {
      const response = await apiClient.post(
        `/admin/system/jobs/trigger`,
        { jobName: job.name },
        {
          // PRIYA: Add API version header for contract drift detection
          headers: { 'X-App-Version': '1.0.0' },
        }
      );

      // PRIYA: Handle 401 - session expired during job trigger
      if (response?.success) {
        showAlert('Success', `"${job.name}" triggered successfully`);
      } else if (
        response?.message?.includes('401') ||
        response?.message?.includes('Unauthorized')
      ) {
        showAlert('Session Expired', 'Your admin session has expired. Please log in again.');
      } else {
        showAlert('Error', response?.message || 'Could not trigger job');
      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not trigger job');
    } finally {
      // PRIYA: Clear loading state after operation
      setTriggeringJob(null);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a52" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderColor: '#22C55E' }]}>
          <Text style={s.summaryNum}>{jobs.filter((j) => j.status === 'healthy').length}</Text>
          <Text style={s.summaryLabel}>Healthy</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: '#F59E0B' }]}>
          <Text style={[s.summaryNum, { color: '#F59E0B' }]}>{warningCount}</Text>
          <Text style={s.summaryLabel}>Overdue</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: '#EF4444' }]}>
          <Text style={[s.summaryNum, { color: '#EF4444' }]}>{failingCount}</Text>
          <Text style={s.summaryLabel}>Failing</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: '#9CA3AF' }]}>
          <Text style={s.summaryNum}>{jobs.length}</Text>
          <Text style={s.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Real-time alert banner */}
      {realtimeAlert && (
        <View style={s.realtimeBanner}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={s.realtimeBannerText} numberOfLines={1}>
            Job Failed: {realtimeAlert.name} — {realtimeAlert.error}
          </Text>
        </View>
      )}

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterChip, !selectedCategory && s.filterChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[s.filterChipText, !selectedCategory && s.filterChipTextActive]}>
            All ({jobs.length})
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              s.filterChip,
              selectedCategory === cat && s.filterChipActive,
              { borderColor: CATEGORY_COLORS[cat] || '#ccc' },
            ]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text
              style={[
                s.filterChipText,
                selectedCategory === cat && s.filterChipTextActive,
              ]}
            >
              {cat} ({jobs.filter((j) => j.category === cat).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchJobs();
            }}
          />
        }
      >
        {filtered.map((job) => {
          const config = STATUS_CONFIG[job.status];
          const isExpanded = expandedJob === job.name;
          const lastRunAgo = job.lastRun
            ? `${Math.round((Date.now() - new Date(job.lastRun).getTime()) / 60000)} min ago`
            : 'Never';

          return (
            <TouchableOpacity
              key={job.name}
              style={[s.jobCard, job.status === 'failing' && s.jobCardFailing]}
              onPress={() => setExpandedJob(isExpanded ? null : job.name)}
            >
              <View style={s.jobHeader}>
                <Ionicons name={config.icon as unknown as keyof typeof Ionicons.glyphMap} size={20} color={config.color} />
                <View style={s.jobInfo}>
                  <Text style={s.jobName}>{job.name}</Text>
                  <Text style={s.jobMeta}>
                    {job.schedule} · Last: {lastRunAgo}
                  </Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: config.color + '20' }]}>
                  <Text style={[s.statusText, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={s.jobDetail}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Category</Text>
                    <Text
                      style={[
                        s.detailValue,
                        { color: CATEGORY_COLORS[job.category] || '#666' },
                      ]}
                    >
                      {job.category}
                    </Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Consecutive Failures</Text>
                    <Text
                      style={[
                        s.detailValue,
                        job.consecutiveFailures > 0 && { color: '#EF4444' },
                      ]}
                    >
                      {job.consecutiveFailures}
                    </Text>
                  </View>
                  {job.lastError && (
                    <View style={s.errorBox}>
                      <Text style={s.errorLabel}>Last Error:</Text>
                      <Text style={s.errorText}>{job.lastError}</Text>
                    </View>
                  )}
                  {/* PRIYA: Disable button during API call to prevent double-trigger */}
                  <TouchableOpacity
                    style={[s.runBtn, triggeringJob === job.name && s.runBtnDisabled]}
                    onPress={() => handleRunNow(job)}
                    disabled={triggeringJob === job.name}
                  >
                    {triggeringJob === job.name ? (
                      <ActivityIndicator size="small" color="#1a3a52" />
                    ) : (
                      <>
                        <Ionicons name="play-circle-outline" size={16} color="#1a3a52" />
                        <Text style={s.runBtnText}>Run Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

