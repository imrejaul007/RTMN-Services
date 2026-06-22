/**
 * TrainingScreen - Model training dashboard
 *
 * Features:
 * - Start/Stop training
 * - View progress
 * - Download models
 * - View metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.HOJAI_TRAINING_URL || 'http://localhost:4560';

interface TrainingJob {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_epoch: number;
  total_epochs: number;
  loss: number;
  accuracy: number;
  model_path: string;
}

interface Model {
  name: string;
  path: string;
  size: number;
  accuracy: number;
}

export default function TrainingScreen() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'models'>('jobs');

  useEffect(() => {
    loadData();
    // Poll for updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [jobsRes, modelsRes] = await Promise.all([
        fetch(`${API_URL}/training/jobs`),
        fetch(`${API_URL}/models`),
      ]);

      const jobsData = await jobsRes.json();
      const modelsData = await modelsRes.json();

      setJobs(jobsData.jobs || []);
      setModels(modelsData.models || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const startTraining = async (type: string) => {
    try {
      const response = await fetch(`${API_URL}/training/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          dataset_path: './datasets',
          output_path: './models',
          epochs: 3,
          batch_size: 8,
        }),
      });

      const data = await response.json();
      console.log('Started training:', data.job_id);
      loadData();
    } catch (e) {
      console.error('Failed to start training:', e);
    }
  };

  const cancelTraining = async (jobId: string) => {
    try {
      await fetch(`${API_URL}/training/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
      loadData();
    } catch (e) {
      console.error('Failed to cancel:', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10B981';
      case 'completed': return '#6366F1';
      case 'failed': return '#EF4444';
      case 'cancelled': return '#F59E0B';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return 'sync';
      case 'completed': return 'checkmark-circle';
      case 'failed': return 'close-circle';
      case 'cancelled': return 'pause-circle';
      default: return 'time';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Model Training</Text>
        <Text style={styles.subtitle}>Train and manage AI models</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
          onPress={() => setActiveTab('jobs')}
        >
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            Training Jobs ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'models' && styles.tabActive]}
          onPress={() => setActiveTab('models')}
        >
          <Text style={[styles.tabText, activeTab === 'models' && styles.tabTextActive]}>
            Models ({models.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <View style={styles.content}>
          {/* Quick Start */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Training</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => startTraining('whisper')}
              >
                <Ionicons name="mic" size={24} color="#6366F1" />
                <Text style={styles.quickButtonText}>Whisper</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => startTraining('intent')}
              >
                <Ionicons name="bulb" size={24} color="#10B981" />
                <Text style={styles.quickButtonText}>Intent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => startTraining('speaker')}
              >
                <Ionicons name="person" size={24} color="#EC4899" />
                <Text style={styles.quickButtonText}>Speaker</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Job List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training Jobs</Text>
            {jobs.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline" size={48} color="#333" />
                <Text style={styles.emptyText}>No training jobs</Text>
              </View>
            ) : (
              jobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View style={styles.jobInfo}>
                      <View style={styles.jobType}>
                        <Ionicons
                          name={getStatusIcon(job.status) as any}
                          size={20}
                          color={getStatusColor(job.status)}
                        />
                        <Text style={styles.jobTypeText}>{job.type.toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.jobStatus, { color: getStatusColor(job.status) }]}>
                        {job.status}
                      </Text>
                    </View>

                    {/* Progress */}
                    {job.status === 'running' && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[styles.progressFill, { width: `${job.progress * 100}%` }]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          Epoch {job.current_epoch}/{job.total_epochs}
                        </Text>
                      </View>
                    )}

                    {/* Metrics */}
                    <View style={styles.metrics}>
                      {job.loss && (
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Loss</Text>
                          <Text style={styles.metricValue}>{job.loss.toFixed(4)}</Text>
                        </View>
                      )}
                      {job.accuracy && (
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Accuracy</Text>
                          <Text style={styles.metricValue}>{(job.accuracy * 100).toFixed(1)}%</Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    {job.status === 'running' && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => cancelTraining(job.id)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    {job.status === 'completed' && job.model_path && (
                      <TouchableOpacity style={styles.downloadButton}>
                        <Ionicons name="download" size={16} color="#6366F1" />
                        <Text style={styles.downloadButtonText}>Download</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <View style={styles.content}>
          {models.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube" size={48} color="#333" />
              <Text style={styles.emptyText}>No trained models</Text>
              <Text style={styles.emptySubtext}>Start training to see models here</Text>
            </View>
          ) : (
            models.map((model) => (
              <View key={model.name} style={styles.modelCard}>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelSize}>{formatSize(model.size)}</Text>
                </View>
                <View style={styles.modelActions}>
                  <TouchableOpacity style={styles.deployButton}>
                    <Ionicons name="rocket" size={16} color="#10B981" />
                    <Text style={styles.deployText}>Deploy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' },
  loadingText: { color: '#666', marginTop: 16 },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  tabActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#6366F1' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', marginBottom: 16 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  quickButtonText: { fontSize: 12, color: '#FFF', fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#444', marginTop: 4 },
  jobCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobType: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobTypeText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  jobStatus: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  progressContainer: { marginTop: 12 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
  progressText: { fontSize: 12, color: '#666', marginTop: 6 },
  metrics: { flexDirection: 'row', marginTop: 12, gap: 16 },
  metric: {},
  metricLabel: { fontSize: 11, color: '#666' },
  metricValue: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  cancelButton: { marginTop: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8 },
  cancelButtonText: { color: '#EF4444', fontWeight: '500' },
  downloadButton: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  downloadButtonText: { color: '#6366F1', fontWeight: '500' },
  modelCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelInfo: {},
  modelName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  modelSize: { fontSize: 12, color: '#666', marginTop: 2 },
  modelActions: { flexDirection: 'row', gap: 8 },
  deployButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  deployText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
});
