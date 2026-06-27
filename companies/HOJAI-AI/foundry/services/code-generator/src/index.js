/**
 * HOJAI Code Generator Engine
 * Port: 4580
 *
 * Generates REAL code from templates:
 * - React Native mobile apps
 * - Backend REST APIs
 * - Database schemas
 * - Deployment configurations
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateReactNativeApp } from './react-native-generator.js';
import { generateBackendAPI } from './backend-generator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4580;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/hojai-generated';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(cors(), express.json());

// Generation jobs
const jobs = new Map();

// ── Templates Registry ──────────────────────────────────────────────────────────

const TEMPLATE_TYPES = {
  ecommerce: {
    name: 'E-Commerce',
    icon: '🛍️',
    screens: ['Home', 'ProductDetail', 'Cart', 'Checkout', 'Orders', 'Profile'],
    apis: ['products', 'orders', 'cart', 'payments', 'users', 'search'],
    models: ['Product', 'Order', 'User', 'Cart', 'Review', 'Address'],
    features: ['product-catalog', 'cart-management', 'order-tracking', 'payment-checkout', 'user-accounts', 'reviews-ratings', 'search-filter', 'wishlist']
  },
  'food-delivery': {
    name: 'Food Delivery',
    icon: '🍔',
    screens: ['Home', 'Restaurant', 'Menu', 'Cart', 'TrackOrder', 'Profile'],
    apis: ['restaurants', 'orders', 'delivery', 'payments', 'reviews'],
    models: ['Restaurant', 'MenuItem', 'Order', 'Delivery', 'Review'],
    features: ['restaurant-discovery', 'menu-browsing', 'cart-management', 'order-tracking', 'delivery-assignment', 'review-system']
  },
  mobility: {
    name: 'Mobility',
    icon: '🚗',
    screens: ['Home', 'RideSelection', 'TrackDriver', 'Payment', 'History', 'Profile'],
    apis: ['rides', 'drivers', 'payments', 'tracking', 'surge'],
    models: ['Ride', 'Driver', 'Vehicle', 'User', 'Payment'],
    features: ['ride-booking', 'driver-matching', 'real-time-tracking', 'surge-pricing', 'payment-processing', 'ride-history']
  },
  healthcare: {
    name: 'Healthcare',
    icon: '🏥',
    screens: ['Home', 'DoctorSearch', 'Appointment', 'Telemedicine', 'Prescriptions', 'Profile'],
    apis: ['doctors', 'appointments', 'telemedicine', 'prescriptions', 'records'],
    models: ['Doctor', 'Patient', 'Appointment', 'Prescription', 'Record'],
    features: ['doctor-search', 'appointment-booking', 'telemedicine', 'prescriptions', 'health-records']
  },
  education: {
    name: 'Education',
    icon: '🎓',
    screens: ['Home', 'Courses', 'Lesson', 'Progress', 'Certificates', 'Profile'],
    apis: ['courses', 'enrollments', 'progress', 'certificates'],
    models: ['Course', 'Lesson', 'Enrollment', 'Certificate', 'User'],
    features: ['course-catalog', 'video-lessons', 'progress-tracking', 'certificates', 'assessments']
  },
  fintech: {
    name: 'Fintech',
    icon: '💰',
    screens: ['Home', 'Accounts', 'Transfers', 'Cards', 'Investments', 'Profile'],
    apis: ['accounts', 'transactions', 'transfers', 'investments', 'cards'],
    models: ['Account', 'Transaction', 'Card', 'Investment', 'User'],
    features: ['account-management', 'money-transfers', 'card-payments', 'investments', 'analytics']
  },
  ota: {
    name: 'Online Travel Agency',
    icon: '✈️',
    screens: ['Home', 'HotelSearch', 'FlightSearch', 'Booking', 'MyTrips', 'Profile'],
    apis: ['hotels', 'flights', 'bookings', 'payments', 'search'],
    models: ['Hotel', 'Flight', 'Booking', 'User', 'Review'],
    features: ['hotel-search', 'flight-search', 'package-booking', 'booking-management', 'reviews']
  },
  logistics: {
    name: 'Logistics',
    icon: '🚚',
    screens: ['Home', 'ShipmentCreate', 'TrackShipment', 'Warehouses', 'Profile'],
    apis: ['shipments', 'tracking', 'warehouses', 'routes'],
    models: ['Shipment', 'Warehouse', 'Route', 'User'],
    features: ['shipment-creation', 'tracking', 'route-optimization', 'warehouse-management']
  },
  restaurant: {
    name: 'Restaurant',
    icon: '🍽️',
    screens: ['POS', 'Menu', 'Orders', 'Tables', 'Kitchen', 'Reports'],
    apis: ['orders', 'menu', 'tables', 'billing', 'kds'],
    models: ['Order', 'MenuItem', 'Table', 'Bill'],
    features: ['pos-system', 'menu-management', 'order-tracking', 'table-management', 'billing']
  }
};

// ── Code Generators ────────────────────────────────────────────────────────────

// Re-export for use by other services
export { generateReactNativeApp, generateBackendAPI };

function generateReactNativeAppLegacy(template, companyName, outputPath) {
  const files = [];

  // package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(template, companyName)
  });

  // App.tsx - Main app with navigation
  files.push({
    path: 'App.tsx',
    content: generateAppTsx(template, companyName)
  });

  // Screen files
  for (const screen of TEMPLATE_TYPES[template]?.screens || []) {
    files.push({
      path: `screens/${screen}.tsx`,
      content: generateScreen(screen, template, companyName)
    });
  }

  // API service
  files.push({
    path: 'services/api.ts',
    content: generateApiService(template, companyName)
  });

  // Types
  files.push({
    path: 'types/index.ts',
    content: generateTypes(template, companyName)
  });

  // Navigation
  files.push({
    path: 'navigation/AppNavigator.tsx',
    content: generateNavigation(template, companyName)
  });

  return files;
}

function generateBackendAPILegacy(template, companyName, outputPath) {
  const files = [];
  const config = TEMPLATE_TYPES[template];

  // package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: `${companyName.toLowerCase().replace(/\s+/g, '-')}-api`,
      version: '1.0.0',
      main: 'src/index.js',
      scripts: { start: 'node src/index.js', dev: 'nodemon src/index.js' },
      dependencies: { express: '^4.18.2', cors: '^2.8.5', mongoose: '^8.0.0', dotenv: '^16.0.0' }
    }, null, 2)
  });

  // Main server
  files.push({
    path: 'src/index.js',
    content: generateBackendMain(template, companyName, config)
  });

  // Routes
  for (const api of config?.apis || []) {
    files.push({
      path: `src/routes/${api}.js`,
      content: generateRoute(api, template, companyName)
    });
  }

  // Models
  for (const model of config?.models || []) {
    files.push({
      path: `src/models/${model}.js`,
      content: generateModel(model, template, companyName)
    });
  }

  // Docker
  files.push({
    path: 'Dockerfile',
    content: generateDockerfile(companyName)
  });

  return files;
}

function generateDatabaseSchemas(template, companyName) {
  const files = [];
  const config = TEMPLATE_TYPES[template];

  for (const model of config?.models || []) {
    files.push({
      path: `schemas/${model}.json`,
      content: JSON.stringify(generateSchema(model, template), null, 2)
    });
  }

  return files;
}

function generateDeploymentConfigs(template, companyName) {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  return [
    {
      path: 'kubernetes/deployment.yaml',
      content: generateK8sDeployment(slug, template)
    },
    {
      path: 'kubernetes/service.yaml',
      content: generateK8sService(slug)
    },
    {
      path: 'docker-compose.yml',
      content: generateDockerCompose(slug)
    },
    {
      path: '.env.example',
      content: generateEnvExample(template)
    }
  ];
}

// ── Template Code Generators ────────────────────────────────────────────────────

function generatePackageJson(template, companyName) {
  const deps = {
    '@react-navigation/native': '^6.1.9',
    '@react-navigation/native-stack': '^6.9.17',
    '@react-navigation/bottom-tabs': '^6.5.11',
    'react-native-screens': '^3.29.0',
    'react-native-safe-area-context': '^4.8.2',
    'axios': '^1.6.2',
    'react-native-vector-icons': '^10.0.0'
  };

  return JSON.stringify({
    name: companyName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios'
    },
    dependencies: deps
  }, null, 2);
}

function generateAppTsx(template, companyName) {
  return `/**
 * ${companyName} - Generated by HOJAI Studio
 * Template: ${TEMPLATE_TYPES[template]?.name || template}
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
${(TEMPLATE_TYPES[template]?.screens || ['Home']).map(s => `import ${s}Screen from './screens/${s}';`).join('\n')}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = { Home: '🏠', Search: '🔍', Cart: '🛒', Profile: '👤' };
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <Text style={styles.icon}>{icons[name] || '📱'}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      ${(TEMPLATE_TYPES[template]?.screens || ['Home']).map(s => `<Tab.Screen name="${s}" component={${s}Screen} />`).join('\n      ')}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Details" component={() => <View style={styles.container}><Text>Details</Text></View>} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  iconContainer: { padding: 4 },
  iconFocused: { backgroundColor: '#E3F2FD', borderRadius: 8 },
  icon: { fontSize: 20 }
});
`;
}

function generateScreen(screenName, template, companyName) {
  const config = TEMPLATE_TYPES[template];
  const isHome = screenName === 'Home';

  return `/**
 * ${screenName} Screen
 * Generated by HOJAI Studio for ${companyName}
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image
} from 'react-native';
import api from '../services/api';

export default function ${screenName}Screen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // API call based on screen type
      const endpoint = getEndpoint('${screenName}');
      const response = await api.get(endpoint);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Use mock data for demo
      setData(getMockData('${screenName}'));
    } finally {
      setLoading(false);
    }
  }

  function getEndpoint(screen) {
    const endpoints = {
      ${(config?.screens || []).map(s => `'${s}': '/api/${s.toLowerCase()}'`).join(',\n      ')}
    };
    return endpoints[screen] || '/api/data';
  }

  function getMockData(screen) {
    // Return mock data for demo purposes
    return [
      { id: '1', name: 'Demo Item 1', price: 999, image: 'https://via.placeholder.com/150' },
      { id: '2', name: 'Demo Item 2', price: 1499, image: 'https://via.placeholder.com/150' },
      { id: '3', name: 'Demo Item 3', price: 799, image: 'https://via.placeholder.com/150' },
    ];
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Details', { item })}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>₹${item.price?.toLocaleString()}</Text>
          <Text style={styles.desc}>{item.description || 'Premium quality product'}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>${companyName}</Text>
        <Text style={styles.headerSubtitle}>${config?.name || screenName}</Text>
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  errorText: { color: '#FF3B30', fontSize: 16, textAlign: 'center', padding: 20 },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#007AFF', borderRadius: 8 },
  retryText: { color: '#FFF', fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  image: { width: '100%', height: 150, backgroundColor: '#E5E5E5' },
  info: { padding: 16 },
  name: { fontSize: 16, fontWeight: '600', color: '#000' },
  price: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginTop: 4 },
  desc: { fontSize: 14, color: '#666', marginTop: 4 }
});
`;
}

function generateApiService(template, companyName) {
  const config = TEMPLATE_TYPES[template];

  return `/**
 * API Service for ${companyName}
 * Generated by HOJAI Studio
 */
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.${companyName.toLowerCase().replace(/\s+/g, '')}.hojai.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = await getToken();
    // config.headers.Authorization = \`Bearer \${token}\`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      // Auth.logout();
    }
    return Promise.reject(error);
  }
);

// API Methods
${(config?.apis || ['data']).map(apiName => `
export const ${apiName.replace(/-/g, '_')}Api = {
  list: (params) => api.get('/api/${apiName}', { params }),
  get: (id) => api.get('/api/${apiName}/\${id}'),
  create: (data) => api.post('/api/${apiName}', data),
  update: (id, data) => api.put('/api/${apiName}/\${id}', data),
  delete: (id) => api.delete('/api/${apiName}/\${id}`).join('')}
};

export default api;
`;
}

function generateTypes(template, companyName) {
  const config = TEMPLATE_TYPES[template];

  return `/**
 * TypeScript Types for ${companyName}
 * Generated by HOJAI Studio
 */
${(config?.models || ['Data']).map(model => `
export interface ${model} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}`).join('\n')}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
`;
}

function generateNavigation(template, companyName) {
  const screens = TEMPLATE_TYPES[template]?.screens || ['Home'];

  return `/**
 * Navigation for ${companyName}
 * Generated by HOJAI Studio
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        ${screens.map(s => `<Tab.Screen name="${s}" options={{ title: '${s}' }} />`).join('\n        ')}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
`;
}

function generateBackendMain(template, companyName, config) {
  return `/**
 * ${companyName} Backend API
 * Generated by HOJAI Studio
 */
import express from 'express';
import cors from 'cors';
import mongoose from 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
${(config?.apis || ['data']).map(api => `import ${api}Router from './routes/${api}.js';`).join('\n')}

// Use routes
${(config?.apis || ['data']).map(api => `app.use('/api/${api}', ${api}Router);`).join('\n')}

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: '${companyName}', template: '${template}' }));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/${companyName.toLowerCase().replace(/\\s+/g, '-')}';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// Start server
app.listen(PORT, () => {
  console.log(\`
╔══════════════════════════════════════╗
║  \${companyName} API — PORT \${PORT}   ║
║  Template: ${config?.name || template}     ║
╚══════════════════════════════════════╝
  \`);
});

export default app;
`;
}

function generateRoute(apiName, template, companyName) {
  return `/**
 * ${apiName} Routes for ${companyName}
 * Generated by HOJAI Studio
 */
import express from 'express';
import ${capitalize(apiName)} from '../models/${capitalize(apiName)}.js';

const router = express.Router();

// GET /api/${apiName} - List all
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filters } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    Object.keys(filters).forEach(key => {
      if (filters[key]) query[key] = filters[key];
    });

    const data = await ${capitalize(apiName)}.find(query).skip(skip).limit(parseInt(limit));
    const total = await ${capitalize(apiName)}.countDocuments(query);

    res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/${apiName}/:id - Get one
router.get('/:id', async (req, res) => {
  try {
    const item = await ${capitalize(apiName)}.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/${apiName} - Create
router.post('/', async (req, res) => {
  try {
    const item = new ${capitalize(apiName)}(req.body);
    await item.save();
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/${apiName}/:id - Update
router.put('/:id', async (req, res) => {
  try {
    const item = await ${capitalize(apiName)}.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/${apiName}/:id - Delete
router.delete('/:id', async (req, res) => {
  try {
    const item = await ${capitalize(apiName)}.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
`;
}

function generateModel(modelName, template, companyName) {
  return `/**
 * ${modelName} Model for ${companyName}
 * Generated by HOJAI Studio
 */
import mongoose from 'mongoose';

const ${modelName}Schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, {
  timestamps: true
});

export default mongoose.model('${modelName}', ${modelName}Schema);
`;
}

function generateSchema(modelName, template) {
  return {
    name: modelName,
    fields: {
      id: { type: 'string', required: true },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' }
    },
    indexes: ['id'],
    relationships: []
  };
}

function generateDockerfile(companyName) {
  return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY ./src ./src
EXPOSE 3000
CMD ["npm", "start"]
`;
}

function generateK8sDeployment(slug, template) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${slug}
  labels:
    app: ${slug}
    template: ${template}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${slug}
  template:
    metadata:
      labels:
        app: ${slug}
    spec:
      containers:
      - name: api
        image: registry.hojai.app/${slug}:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: ${slug}-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
`;
}

function generateK8sService(slug) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${slug}
spec:
  selector:
    app: ${slug}
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
`;
}

function generateDockerCompose(slug) {
  return `version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/${slug}
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
`;
}

function generateEnvExample(template) {
  return `# ${capitalize(template)} Environment Variables
# Generated by HOJAI Studio

# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/${template}

# API Keys
STRIPE_API_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# External Services
GOOGLE_MAPS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
`;
}

function capitalize(str) {
  return str.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

// ── Routes ─────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'code-generator',
  templates: Object.keys(TEMPLATE_TYPES)
}));

app.get('/api/v1/templates', (_, res) => {
  const templates = Object.entries(TEMPLATE_TYPES).map(([id, config]) => ({
    id,
    name: config.name,
    icon: config.icon,
    screens: config.screens,
    apis: config.apis,
    models: config.models
  }));
  res.json({ success: true, templates });
});

app.get('/api/v1/templates/:id', (req, res) => {
  const template = TEMPLATE_TYPES[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ success: true, template: { id: req.params.id, ...template } });
});

// Generate full project
app.post('/api/v1/generate', requireInternal, async (req, res) => {
  const { companyName, template, options } = req.body;

  if (!companyName || !template) {
    return res.status(400).json({ error: 'companyName and template required' });
  }

  if (!TEMPLATE_TYPES[template]) {
    return res.status(400).json({ error: `Unknown template: ${template}. Options: ${Object.keys(TEMPLATE_TYPES).join(', ')}` });
  }

  const jobId = uuidv4();
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const outputPath = `${OUTPUT_DIR}/${jobId}`;

  mkdirSync(`${outputPath}/mobile`, { recursive: true });
  mkdirSync(`${outputPath}/backend/src/routes`, { recursive: true });
  mkdirSync(`${outputPath}/backend/src/models`, { recursive: true });
  mkdirSync(`${outputPath}/backend/schemas`, { recursive: true });
  mkdirSync(`${outputPath}/kubernetes`, { recursive: true });

  const job = {
    id: jobId,
    companyName,
    template,
    status: 'generating',
    progress: 0,
    files: { mobile: 0, backend: 0, deployment: 0 },
    startedAt: new Date().toISOString()
  };
  jobs.set(jobId, job);

  try {
    // Generate React Native app
    job.progress = 10;
    const mobileFiles = generateReactNativeApp(template, companyName, outputPath);
    for (const file of mobileFiles) {
      writeFileSync(`${outputPath}/mobile/${file.path}`, file.content);
    }
    job.files.mobile = mobileFiles.length;
    job.progress = 40;

    // Generate Backend API
    job.progress = 50;
    const backendFiles = generateBackendAPI(template, companyName, outputPath);
    for (const file of backendFiles) {
      writeFileSync(`${outputPath}/backend/${file.path}`, file.content);
    }
    job.files.backend = backendFiles.length;
    job.progress = 70;

    // Generate Database Schemas
    const schemaFiles = generateDatabaseSchemas(template, companyName);
    for (const file of schemaFiles) {
      writeFileSync(`${outputPath}/backend/${file.path}`, file.content);
    }

    // Generate Deployment Configs
    const deployFiles = generateDeploymentConfigs(template, companyName);
    for (const file of deployFiles) {
      writeFileSync(`${outputPath}/${file.path}`, file.content);
    }
    job.files.deployment = deployFiles.length;

    job.status = 'completed';
    job.progress = 100;
    job.outputPath = outputPath;
    job.completedAt = new Date().toISOString();

    res.status(201).json({
      success: true,
      job: {
        id: jobId,
        companyName,
        template,
        status: 'completed',
        filesGenerated: job.files.mobile + job.files.backend + job.files.deployment,
        outputPath,
        downloadUrl: `/api/v1/download/${jobId}`
      }
    });

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get generation status
app.get('/api/v1/generate/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true, job });
});

// Download generated code
app.get('/api/v1/download/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'completed') return res.status(400).json({ error: 'Job not completed' });

  // In production, this would stream a zip file
  res.json({
    success: true,
    message: 'Download ready',
    path: job.outputPath,
    files: job.files
  });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════════════════════╗
║  Code Generator — PORT ${PORT}                              ║
║  Generates real React Native apps + Backend APIs        ║
╠══════════════════════════════════════════════════════════╣
║  POST /api/v1/generate  — Generate full project       ║
║  GET  /api/v1/templates — List templates              ║
║  GET  /api/v1/generate/:id — Check status           ║
╚══════════════════════════════════════════════════════════╝
`));

export default app;
