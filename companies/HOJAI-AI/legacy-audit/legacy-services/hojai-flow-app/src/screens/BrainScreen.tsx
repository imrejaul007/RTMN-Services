/**
 * BrainScreen - Personal Knowledge Graph
 *
 * NOT "Memory" or "Knowledge Base"
 * This is YOUR brain - contacts, projects, decisions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BrainSection = 'contacts' | 'projects' | 'decisions' | 'context';

interface Contact {
  id: string;
  name: string;
  role?: string;
  company?: string;
  lastContacted?: string;
  importance: number;
}

interface Project {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  priority: number;
}

interface Decision {
  id: string;
  title: string;
  decidedAt: string;
  outcome?: string;
}

const SECTIONS = [
  { id: 'contacts', label: 'Contacts', icon: 'people', color: '#6366F1' },
  { id: 'projects', label: 'Projects', icon: 'folder', color: '#10B981' },
  { id: 'decisions', label: 'Decisions', icon: 'checkbox', color: '#F59E0B' },
  { id: 'context', label: 'Context', icon: 'layers', color: '#8B5CF6' },
] as const;

export default function BrainScreen() {
  const [activeSection, setActiveSection] = useState<BrainSection>('contacts');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock data
  const [contacts] = useState<Contact[]>([
    { id: '1', name: 'Rahul Sharma', role: 'Sales Director', company: 'ABC Corp', lastContacted: '2 days ago', importance: 9 },
    { id: '2', name: 'Priya Patel', role: 'Marketing Head', company: 'XYZ Ltd', lastContacted: '1 week ago', importance: 7 },
    { id: '3', name: 'Amit Kumar', role: 'CEO', company: 'Startup Inc', lastContacted: '3 days ago', importance: 10 },
  ]);

  const [projects] = useState<Project[]>([
    { id: '1', title: 'Q2 Revenue Target', status: 'active', priority: 9 },
    { id: '2', title: 'New Product Launch', status: 'active', priority: 8 },
    { id: '3', title: 'Team Expansion', status: 'paused', priority: 6 },
  ]);

  const [decisions] = useState<Decision[]>([
    { id: '1', title: 'Hire 2 more sales reps', decidedAt: 'May 15', outcome: 'Approved' },
    { id: '2', title: 'Launch premium tier pricing', decidedAt: 'May 20', outcome: 'In progress' },
  ]);

  const handleAddContact = useCallback(() => {
    Alert.prompt(
      'Add Contact',
      'Enter name',
      async (name) => {
        if (name?.trim()) {
          Alert.alert('Added', `${name} added to contacts`);
        }
      },
      'plain-text'
    );
  }, []);

  const handleAddProject = useCallback(() => {
    Alert.prompt(
      'Add Project',
      'Enter project name',
      async (title) => {
        if (title?.trim()) {
          Alert.alert('Added', `Project "${title}" created`);
        }
      },
      'plain-text'
    );
  }, []);

  const handleAddDecision = useCallback(() => {
    Alert.prompt(
      'Record Decision',
      'Enter decision',
      async (decision) => {
        if (decision?.trim()) {
          Alert.alert('Recorded', `Decision "${decision}" saved`);
        }
      },
      'plain-text'
    );
  }, []);

  const handleAddContext = useCallback(() => {
    Alert.alert(
      'Add Context',
      'What is your current situation?',
      [
        { text: 'Working on product launch', onPress: () => {} },
        { text: 'Focusing on sales', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const getAddHandler = () => {
    switch (activeSection) {
      case 'contacts': return handleAddContact;
      case 'projects': return handleAddProject;
      case 'decisions': return handleAddDecision;
      case 'context': return handleAddContext;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Brain</Text>
          <Text style={styles.subtitle}>
            {contacts.length} contacts • {projects.length} projects • {decisions.length} decisions
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={getAddHandler()}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search brain..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Section Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.tab,
              activeSection === section.id && styles.tabActive,
            ]}
            onPress={() => setActiveSection(section.id as BrainSection)}
          >
            <View style={[
              styles.tabIcon,
              { backgroundColor: activeSection === section.id ? section.color + '20' : 'transparent' }
            ]}>
              <Ionicons
                name={section.icon as any}
                size={18}
                color={activeSection === section.id ? section.color : '#666'}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              activeSection === section.id && { color: section.color }
            ]}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeSection === 'contacts' && (
          <ContactsList contacts={contacts} />
        )}
        {activeSection === 'projects' && (
          <ProjectsList projects={projects} />
        )}
        {activeSection === 'decisions' && (
          <DecisionsList decisions={decisions} />
        )}
        {activeSection === 'context' && (
          <ContextView />
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickAction
          icon="person-add"
          label="Add Contact"
          onPress={handleAddContact}
        />
        <QuickAction
          icon="folder-open"
          label="Add Project"
          onPress={handleAddProject}
        />
        <QuickAction
          icon="checkbox"
          label="Record Decision"
          onPress={handleAddDecision}
        />
      </View>
    </View>
  );
}

function ContactsList({ contacts }: { contacts: Contact[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Top Contacts</Text>
      {contacts.map((contact) => (
        <View key={contact.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {contact.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{contact.name}</Text>
              {contact.role && (
                <Text style={styles.cardSubtitle}>
                  {contact.role} at {contact.company}
                </Text>
              )}
            </View>
            <View style={styles.importanceBadge}>
              <Text style={styles.importanceText}>{contact.importance}</Text>
            </View>
          </View>
          {contact.lastContacted && (
            <Text style={styles.lastContacted}>
              Last contacted: {contact.lastContacted}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function ProjectsList({ projects }: { projects: Project[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'completed': return '#6366F1';
      default: return '#666';
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Active Projects</Text>
      {projects.map((project) => (
        <View key={project.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(project.status) }
            ]} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{project.title}</Text>
              <Text style={styles.cardSubtitle}>{project.status}</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>P{project.priority}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function DecisionsList({ decisions }: { decisions: Decision[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Recent Decisions</Text>
      {decisions.map((decision) => (
        <View key={decision.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkbox" size={20} color="#F59E0B" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{decision.title}</Text>
              <Text style={styles.cardSubtitle}>
                {decision.decidedAt}
              </Text>
            </View>
          </View>
          {decision.outcome && (
            <View style={styles.outcomeBadge}>
              <Text style={styles.outcomeText}>{decision.outcome}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ContextView() {
  return (
    <View style={styles.contextContainer}>
      <Text style={styles.sectionTitle}>Current Context</Text>
      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name="layers" size={24} color="#8B5CF6" />
        </View>
        <Text style={styles.contextTitle}>Working on growth</Text>
        <Text style={styles.contextDesc}>
          Focus areas: Sales, Product, Customer Success
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Memories</Text>
      <View style={styles.memoryItem}>
        <Ionicons name="chatbubbles" size={16} color="#6366F1" />
        <Text style={styles.memoryText}>Discussed pricing with Rahul</Text>
      </View>
      <View style={styles.memoryItem}>
        <Ionicons name="checkbox" size={16} color="#F59E0B" />
        <Text style={styles.memoryText}>Decided to hire 2 more reps</Text>
      </View>
      <View style={styles.memoryItem}>
        <Ionicons name="alert-circle" size={16} color="#10B981" />
        <Text style={styles.memoryText}>Q2 target is ambitious</Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon as any} size={18} color="#6366F1" />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  tabsScroll: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  importanceBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  importanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  lastContacted: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 52,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  priorityBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  outcomeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 32,
  },
  outcomeText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  contextContainer: {},
  contextCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  contextIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contextTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  contextDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  memoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  memoryText: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickAction: {
    alignItems: 'center',
    gap: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '500',
  },
});
