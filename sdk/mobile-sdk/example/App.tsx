/**
 * RTMN Mobile SDK - Example Usage
 *
 * This example demonstrates how to integrate the RTMN Mobile SDK
 * into a React Native application.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import RTMNSdk, {
  CustomerTwinAPI,
  TicketAPI,
  ChatAPI,
  AnalyticsAPI,
  NotificationsAPI,
  Customer,
  Ticket,
  ChatMessage,
  PushNotification,
} from '../src';

// ============== Configuration ==============

const SDK_CONFIG = {
  apiUrl: 'https://rtmn-pilot-onboarding.onrender.com',
  eventBusUrl: 'wss://rtmn-pilot-onboarding.onrender.com/events',
  debug: true,
};

// ============== Example: Customer Twin ==============

async function customerTwinExample(sdk: typeof RTMNSdk) {
  console.log('=== Customer Twin Example ===');

  try {
    // Get customer profile
    const profile = await sdk.customer.getProfile();
    console.log('Customer Profile:', profile);

    // Update profile
    const updated = await sdk.customer.updateProfile({
      name: 'John Doe',
      metadata: { favorite_color: 'blue' },
    });
    console.log('Updated Profile:', updated);

    // Get interaction history
    const history = await sdk.customer.getHistory({ limit: 10 });
    console.log('Interaction History:', history);

  } catch (error) {
    console.error('Customer Twin Error:', error);
  }
}

// ============== Example: Ticket Management ==============

async function ticketExample(sdk: typeof RTMNSdk) {
  console.log('=== Ticket Example ===');

  try {
    // Create a ticket
    const newTicket = await sdk.ticket.create({
      title: 'Need help with my order',
      description: 'I placed an order yesterday but have not received confirmation email.',
      priority: 'high',
      category: 'order',
      tags: ['order', 'urgent'],
    });
    console.log('Created Ticket:', newTicket);

    // Get all open tickets
    const tickets = await sdk.ticket.getAll({ status: ['open', 'in_progress'] });
    console.log('Open Tickets:', tickets);

    // Add comment to ticket
    await sdk.ticket.addComment(newTicket.id, 'Here is the order number: ORD-12345', false);

    // Subscribe to ticket updates
    const unsubscribe = sdk.ticket.onUpdate((ticket: Ticket) => {
      console.log('Ticket Updated:', ticket);
    });

    // Close ticket when done
    // await sdk.ticket.close(newTicket.id);
    // unsubscribe();

  } catch (error) {
    console.error('Ticket Error:', error);
  }
}

// ============== Example: Real-time Chat ==============

function chatExample(sdk: typeof RTMNSdk) {
  console.log('=== Chat Example ===');

  // Connect to chat
  sdk.chat.connect('user-123');

  // Listen for messages
  sdk.chat.onMessage((message: ChatMessage) => {
    console.log('New Message:', message);
  });

  // Listen for typing indicators
  sdk.chat.onTyping(({ userId, isTyping }) => {
    console.log(`User ${userId} is ${isTyping ? 'typing...' : 'stopped'}`);
  });

  // Listen for agent joining
  sdk.chat.onAgentJoined(({ agentId, agentName }) => {
    console.log(`Agent ${agentName} (${agentId}) joined the chat`);
  });

  // Send a message
  sdk.chat.sendMessage('Hello, I need help with my account!');

  // Send typing indicator
  sdk.chat.sendTyping(true);
  setTimeout(() => sdk.chat.sendTyping(false), 2000);

  // Disconnect when done
  // sdk.chat.disconnect();
}

// ============== Example: Analytics ==============

function analyticsExample(sdk: typeof RTMNSdk) {
  console.log('=== Analytics Example ===');

  // Identify user
  sdk.analytics.identify('user-123', {
    email: 'user@example.com',
    name: 'John Doe',
    plan: 'premium',
  });

  // Track screen views
  sdk.analytics.screen('Home');
  sdk.analytics.screen('ProductDetail', { productId: 'prod-123' });

  // Track custom events
  sdk.analytics.track('button_clicked', {
    button_name: 'buy_now',
    screen: 'ProductDetail',
    product_id: 'prod-123',
  });

  sdk.analytics.track('purchase_completed', {
    order_id: 'ord-123',
    revenue: 99.99,
    currency: 'USD',
    items: 3,
  });

  // Track search
  sdk.analytics.trackSearch('wireless headphones', 42);

  // Track errors
  sdk.analytics.trackError(new Error('Payment failed'));

  // Flush events
  sdk.analytics.flush().then(() => {
    console.log('Analytics events flushed');
  });
}

// ============== Example: Push Notifications ==============

async function notificationsExample(sdk: typeof RTMNSdk) {
  console.log('=== Notifications Example ===');

  // Request permission
  const permission = await sdk.notifications.requestPermission();
  console.log('Permission:', permission);

  // Subscribe to topics
  await sdk.notifications.subscribe('tickets');
  await sdk.notifications.subscribe('promotions');

  // Handle incoming notifications
  sdk.notifications.onNotification((notification: PushNotification) => {
    console.log('Notification:', notification);
    Alert.alert(notification.title || 'Notification', notification.body);
  });

  // Handle notification tap
  sdk.notifications.onNotificationOpened((notification: PushNotification) => {
    console.log('Notification Opened:', notification);
    // Navigate to specific screen based on notification data
    if (notification.data?.type === 'ticket_update') {
      // navigation.navigate('TicketDetail', { id: notification.data.ticketId });
    }
  });
}

// ============== React Native Example Component ==============

const RTMNExampleApp: React.FC = () => {
  const [sdk, setSdk] = useState<typeof RTMNSdk | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  // Initialize SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        await RTMNSdk.init(SDK_CONFIG);
        setSdk(RTMNSdk);
        console.log('SDK Initialized');

        // Load initial data
        const profile = await RTMNSdk.customer.getProfile();
        setCustomer(profile);

        const openTickets = await RTMNSdk.ticket.getAll({ status: ['open'] });
        setTickets(openTickets);

        // Setup chat connection
        RTMNSdk.chat.connect(profile.id);

        RTMNSdk.chat.onMessage((msg) => {
          setChatMessages((prev) => [...prev, msg]);
        });

      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      }
    };

    initSdk();

    return () => {
      RTMNSdk.chat.disconnect();
    };
  }, []);

  // Track screen view
  useEffect(() => {
    if (sdk) {
      sdk.analytics.screen('ExampleApp');
    }
  }, [sdk]);

  // Create ticket handler
  const handleCreateTicket = async () => {
    if (!sdk || !ticketTitle.trim()) return;

    try {
      const ticket = await sdk.ticket.create({
        title: ticketTitle,
        description: ticketDescription,
        priority: 'medium',
      });
      setTickets((prev) => [ticket, ...prev]);
      setTicketTitle('');
      setTicketDescription('');
      Alert.alert('Success', `Ticket ${ticket.ticketNumber} created!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create ticket');
    }
  };

  // Send chat message handler
  const handleSendMessage = () => {
    if (!sdk || !messageInput.trim()) return;
    sdk.chat.sendMessage(messageInput);
    setMessageInput('');
  };

  // Request notification permission
  const handleEnableNotifications = async () => {
    if (!sdk) return;
    const permission = await sdk.notifications.requestPermission();
    if (permission.granted) {
      Alert.alert('Success', 'Notifications enabled!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RTMN Mobile SDK</Text>
          <Text style={styles.subtitle}>React Native Example</Text>
        </View>

        {/* Customer Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Profile</Text>
          {customer ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>Name: {customer.name}</Text>
              <Text style={styles.cardText}>Email: {customer.email}</Text>
              <Text style={styles.cardText}>Twin ID: {customer.twinId}</Text>
            </View>
          ) : (
            <Text style={styles.loading}>Loading...</Text>
          )}
        </View>

        {/* Create Ticket */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Support Ticket</Text>
          <TextInput
            style={styles.input}
            placeholder="Ticket Title"
            value={ticketTitle}
            onChangeText={setTicketTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={ticketDescription}
            onChangeText={setTicketDescription}
            multiline
            numberOfLines={4}
          />
          <Button title="Create Ticket" onPress={handleCreateTicket} />
        </View>

        {/* Open Tickets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Open Tickets ({tickets.length})</Text>
          {tickets.map((ticket) => (
            <View key={ticket.id} style={styles.card}>
              <Text style={styles.ticketTitle}>
                {ticket.ticketNumber} - {ticket.title}
              </Text>
              <Text style={styles.ticketStatus}>Status: {ticket.status}</Text>
              <Text style={styles.ticketPriority}>Priority: {ticket.priority}</Text>
            </View>
          ))}
        </View>

        {/* Chat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Chat</Text>
          <View style={styles.chatMessages}>
            {chatMessages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.chatMessage,
                  msg.senderType === 'customer' ? styles.customerMessage : styles.agentMessage,
                ]}
              >
                <Text style={styles.messageText}>{msg.content}</Text>
                <Text style={styles.messageMeta}>
                  {msg.senderType} - {new Date(msg.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              value={messageInput}
              onChangeText={setMessageInput}
              onSubmitEditing={handleSendMessage}
            />
            <Button title="Send" onPress={handleSendMessage} />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Button
            title="Enable Notifications"
            onPress={handleEnableNotifications}
          />
        </View>

        {/* Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <Text style={styles.cardText}>
            Session ID: {sdk?.analytics.getSessionId()}
          </Text>
          <Text style={styles.cardText}>
            Queued Events: {sdk?.analytics.getQueueSize()}
          </Text>
          <Button
            title="Flush Events"
            onPress={() => sdk?.analytics.flush()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============== Styles ==============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  loading: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ticketStatus: {
    fontSize: 12,
    color: '#666',
  },
  ticketPriority: {
    fontSize: 12,
    color: '#999',
  },
  chatMessages: {
    maxHeight: 200,
    marginBottom: 8,
  },
  chatMessage: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  customerMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
  },
  agentMessage: {
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageMeta: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 8,
    fontSize: 14,
  },
});

export default RTMNExampleApp;

// ============== Console Examples ==============

/**
 * To use these examples, call them after SDK initialization:
 *
 * import RTMNSdk from '@rtmn/mobile-sdk';
 *
 * async function main() {
 *   await RTMNSdk.init({ apiUrl: 'https://api.example.com' });
 *
 *   // Run examples
 *   await customerTwinExample(RTMNSdk);
 *   await ticketExample(RTMNSdk);
 *   chatExample(RTMNSdk);
 *   analyticsExample(RTMNSdk);
 *   await notificationsExample(RTMNSdk);
 * }
 */
