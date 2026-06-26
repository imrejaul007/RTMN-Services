/**
 * React Native Code Generator
 *
 * Generates real, working React Native mobile apps from templates:
 * - App structure and navigation
 * - Screens and components
 * - API integration
 * - State management
 * - Native module bridges
 */

import { v4 as uuidv4 } from 'uuid';

export class ReactNativeGenerator {
  constructor() {
    this.templateDir = '';
    this.projectName = '';
    this.config = {};
  }

  /**
   * Generate complete React Native app
   */
  generateApp(config) {
    this.config = config;
    this.projectName = config.projectName;

    const files = {};

    // Package.json
    files['package.json'] = this.generatePackageJson();

    // App entry point
    files['App.tsx'] = this.generateAppEntry();

    // Navigation
    files['src/navigation/AppNavigator.tsx'] = this.generateNavigation();

    // Screens
    for (const screen of config.screens || []) {
      files[`src/screens/${screen.name}.tsx`] = this.generateScreen(screen);
    }

    // Components
    for (const component of config.components || []) {
      files[`src/components/${component.name}.tsx`] = this.generateComponent(component);
    }

    // API client
    files['src/services/api.ts'] = this.generateAPIClient();

    // Redux store
    if (config.stateManagement === 'redux') {
      files['src/store/index.ts'] = this.generateReduxStore();
      files['src/store/slices/authSlice.ts'] = this.generateReduxSlice('auth');
      files['src/store/slices/dataSlice.ts'] = this.generateReduxSlice('data');
    }

    // Context providers
    if (config.stateManagement === 'context') {
      files['src/context/AuthContext.tsx'] = this.generateAuthContext();
      files['src/context/AppContext.tsx'] = this.generateAppContext();
    }

    // Native bridges
    files['src/native/ImagePicker.ts'] = this.generateNativeBridge('ImagePicker');
    files['src/native/PushNotifications.ts'] = this.generateNativeBridge('PushNotifications');
    files['src/native/Geolocation.ts'] = this.generateNativeBridge('Geolocation');

    // Screens
    if (config.features?.includes('auth')) {
      files['src/screens/auth/LoginScreen.tsx'] = this.generateAuthScreen('login');
      files['src/screens/auth/RegisterScreen.tsx'] = this.generateAuthScreen('register');
    }

    if (config.features?.includes('home')) {
      files['src/screens/HomeScreen.tsx'] = this.generateHomeScreen();
    }

    if (config.features?.includes('profile')) {
      files['src/screens/ProfileScreen.tsx'] = this.generateProfileScreen();
    }

    if (config.features?.includes('cart') || config.features?.includes('orders')) {
      files['src/screens/CartScreen.tsx'] = this.generateCartScreen();
      files['src/screens/OrderScreen.tsx'] = this.generateOrderScreen();
    }

    if (config.features?.includes('search')) {
      files['src/screens/SearchScreen.tsx'] = this.generateSearchScreen();
    }

    if (config.features?.includes('map') || config.features?.includes('tracking')) {
      files['src/screens/MapScreen.tsx'] = this.generateMapScreen();
    }

    // Config
    files['src/config/constants.ts'] = this.generateConstants();
    files['src/config/theme.ts'] = this.generateTheme();

    // Utils
    files['src/utils/helpers.ts'] = this.generateHelpers();
    files['src/utils/validation.ts'] = this.generateValidation();

    // Babel config
    files['babel.config.js'] = this.generateBabelConfig();

    // TypeScript config
    files['tsconfig.json'] = this.generateTSConfig();

    // Metro config
    files['metro.config.js'] = this.generateMetroConfig();

    // iOS Podfile
    files['ios/Podfile'] = this.generateIOSPodfile();

    return files;
  }

  generatePackageJson() {
    const deps = {
      'react-native': '^0.73.0',
      'react': '^18.2.0',
      '@react-navigation/native': '^6.1.9',
      '@react-navigation/native-stack': '^6.9.17',
      '@react-navigation/bottom-tabs': '^6.5.11',
      'react-native-screens': '^3.29.0',
      'react-native-safe-area-context': '^4.8.2',
      'react-native-gesture-handler': '^2.14.1',
      'axios': '^1.6.0',
      'react-native-vector-icons': '^10.0.3',
      'react-native-reanimated': '^3.6.1',
      'react-native-mmkv': '^2.12.1',
    };

    if (this.config.stateManagement === 'redux') {
      deps['@reduxjs/toolkit'] = '^2.0.1';
      deps['react-redux'] = '^9.0.4';
    }

    if (this.config.features?.includes('map') || this.config.features?.includes('tracking')) {
      deps['react-native-maps'] = '^1.8.0';
    }

    if (this.config.features?.includes('notifications')) {
      deps['@react-native-firebase/app'] = '^18.7.3';
      deps['@react-native-firebase/messaging'] = '^18.7.3';
    }

    if (this.config.features?.includes('image')) {
      deps['react-native-image-picker'] = '^7.1.0';
    }

    if (this.config.features?.includes('location')) {
      deps['@react-native-community/geolocation'] = '^3.1.0';
    }

    return {
      name: this.projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'react-native start',
        android: 'react-native run-android',
        ios: 'react-native run-ios',
        lint: 'eslint .',
        test: 'jest',
        build: 'react-native build'
      },
      dependencies: deps,
      devDependencies: {
        '@babel/core': '^7.20.0',
        '@babel/preset-env': '^7.20.0',
        '@babel/runtime': '^7.20.0',
        '@react-native/babel-preset': '0.73.19',
        '@react-native/eslint-config': '0.73.1',
        '@react-native/metro-config': '0.73.3',
        '@react-native/typescript-config': '0.73.1',
        '@types/react': '^18.2.6',
        '@types/react-native-vector-icons': '^6.4.18',
        'typescript': '5.0.4',
        'eslint': '^8.19.0'
      }
    };
  }

  generateAppEntry() {
    const stateImports = this.config.stateManagement === 'redux'
      ? `import { Provider } from 'react-redux';
import { store } from './src/store';`
      : `import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';`;

    const stateWrap = this.config.stateManagement === 'redux'
      ? `<Provider store={store}>
    <App />
  </Provider>`
      : `<AuthProvider>
    <AppProvider>
      <App />
    </AppProvider>
  </AuthProvider>`;

    return `import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
${stateImports}

import AppNavigator from './src/navigation/AppNavigator';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          ${stateWrap}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
`;
  }

  generateNavigation() {
    const screens = this.getScreenList();
    const tabScreens = screens.filter(s => s.tab);
    const stackScreens = screens.filter(s => !s.tab);

    let stackImports = stackScreens.map(s => `import { ${s.component} } from '../screens/${s.screenPath}';`).join('\n');
    let tabImports = tabScreens.map(s => `import { ${s.component} } from '../screens/${s.screenPath}';`).join('\n');

    let stackScreensCode = stackScreens.map(s => `
        <Stack.Screen
          name="${s.name}"
          component={${s.component}}
          options={{ headerShown: ${s.headerShown !== false} }}
        />`).join('');

    let tabScreensCode = tabScreens.map(t => `
          <BottomTab.Screen
            name="${t.name}"
            component={${t.component}}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Icon name="${t.icon || 'home'}" size={size} color={color} />
              ),
            }}
          />`).join('');

    return `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
${stackImports ? '\n' + stackImports : ''}
${tabImports ? '\n' + tabImports : ''}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

${tabScreens.length > 0 ? `
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >${tabScreensCode}
    </Tab.Navigator>
  );
};
` : ''}

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
${stackScreensCode}
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
`;
  }

  getScreenList() {
    const screens = [];
    const features = this.config.features || [];

    // Auth screens
    if (features.includes('auth')) {
      screens.push(
        { name: 'Login', component: 'LoginScreen', screenPath: 'auth/LoginScreen', tab: false, headerShown: false },
        { name: 'Register', component: 'RegisterScreen', screenPath: 'auth/RegisterScreen', tab: false, headerShown: false }
      );
    }

    // Main tab screens
    screens.push({ name: 'Home', component: 'HomeScreen', screenPath: 'HomeScreen', tab: true, icon: 'home' });

    if (features.includes('search')) {
      screens.push({ name: 'Search', component: 'SearchScreen', screenPath: 'SearchScreen', tab: true, icon: 'magnify' });
    }

    if (features.includes('cart') || features.includes('orders')) {
      screens.push({ name: 'Cart', component: 'CartScreen', screenPath: 'CartScreen', tab: true, icon: 'cart' });
      screens.push({ name: 'Orders', component: 'OrderScreen', screenPath: 'OrderScreen', tab: true, icon: 'clipboard-list' });
    }

    if (features.includes('map') || features.includes('tracking')) {
      screens.push({ name: 'Map', component: 'MapScreen', screenPath: 'MapScreen', tab: true, icon: 'map-marker' });
    }

    if (features.includes('profile')) {
      screens.push({ name: 'Profile', component: 'ProfileScreen', screenPath: 'ProfileScreen', tab: true, icon: 'account' });
    }

    return screens;
  }

  generateScreen(screen) {
    return `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

interface Props {
  ${screen.props || ''}
}

const ${screen.name}Screen: React.FC<Props> = (props) => {
  const navigation = useNavigation();
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('${screen.endpoint || '/data'}');
      setData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleItemPress = (item: any) => {
    // Navigate to details
    navigation.navigate('${screen.detailScreen || 'Home'}', { item });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleItemPress(item)}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name || item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.description || item.subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="inbox-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
});

export default ${screen.name}Screen;
`;
  }

  generateComponent(component) {
    return `import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  title?: string;
  subtitle?: string;
  image?: string;
  onPress?: () => void;
  style?: any;
}

const ${component.name}Component: React.FC<Props> = ({
  title,
  subtitle,
  image,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {image && <Image source={{ uri: image }} style={styles.image} />}
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
});

export default ${component.name}Component;
`;
  }

  generateAPIClient() {
    return `import axios, { AxiosInstance, AxiosError } from 'axios';
import { Storage } from 'react-native-mmkv';

const storage = new Storage();

// Configure base URL based on environment
const BASE_URL = __DEV__
  ? 'http://localhost:4001/api'
  : 'https://api.${this.projectName?.toLowerCase() || 'app'}.com/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = storage.getString('auth_token');
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          storage.delete('auth_token');
          // Navigate to login
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      storage.set('auth_token', response.data.token);
    }
    return response.data;
  }

  async register(data: { email: string; password: string; name: string }) {
    const response = await this.client.post('/auth/register', data);
    if (response.data.token) {
      storage.set('auth_token', response.data.token);
    }
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    storage.delete('auth_token');
  }

  // Generic CRUD
  async get<T>(endpoint: string, params?: object): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data?: object): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: object): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  // File upload
  async uploadFile(endpoint: string, file: { uri: string; name: string; type: string }) {
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await this.client.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
`;
  }

  generateReduxStore() {
    return `import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dataReducer from './slices/dataSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
  }

  generateReduxSlice(name) {
    if (name === 'auth') {
      return `import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.login(email, password);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const response = await api.register(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
`;
    }

    return `import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

interface ${name.charAt(0).toUpperCase() + name.slice(1)}Item {
  id: string;
  name: string;
  description?: string;
}

interface ${name.charAt(0).toUpperCase() + name.slice(1)}State {
  items: ${name.charAt(0).toUpperCase() + name.slice(1)}Item[];
  loading: boolean;
  error: string | null;
}

const initialState: ${name.charAt(0).toUpperCase() + name.slice(1)}State = {
  items: [],
  loading: false,
  error: null,
};

export const fetchItems = createAsyncThunk(
  '${name}/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/${name}');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const ${name}Slice = createSlice({
  name: '${name}',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<${name.charAt(0).toUpperCase() + name.slice(1)}Item>) => {
      state.items.push(action.payload);
    },
    updateItem: (state, action: PayloadAction<${name.charAt(0).toUpperCase() + name.slice(1)}Item>) => {
      const index = state.items.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addItem, updateItem, removeItem } = ${name}Slice.actions;
export default ${name}Slice.reducer;
`;
  }

  generateAuthContext() {
    return `import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Storage } from 'react-native-mmkv';

const storage = new Storage();

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: any, action: any) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'LOGOUT':
      return { user: null, token: null, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session
    const token = storage.getString('auth_token');
    const userStr = storage.getString('user');
    if (token && userStr) {
      dispatch({ type: 'SET_USER', payload: { user: JSON.parse(userStr), token } });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(\`http://localhost:4001/api/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.token) {
        storage.set('auth_token', data.token);
        storage.set('user', JSON.stringify(data.user));
        dispatch({ type: 'SET_USER', payload: data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
    }
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(\`http://localhost:4001/api/auth/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.token) {
        storage.set('auth_token', result.token);
        storage.set('user', JSON.stringify(result.user));
        dispatch({ type: 'SET_USER', payload: result });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Registration failed' });
    }
  };

  const logout = async () => {
    try {
      await fetch(\`http://localhost:4001/api/auth/logout\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      storage.delete('auth_token');
      storage.delete('user');
      dispatch({ type: 'LOGOUT' });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
`;
  }

  generateAppContext() {
    return `import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface AppState {
  cart: CartItem[];
  wishlist: string[];
  notifications: Notification[];
  settings: Settings;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface Settings {
  notifications: boolean;
  darkMode: boolean;
  language: string;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<any>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const initialState: AppState = {
  cart: [],
  wishlist: [],
  notifications: [],
  settings: {
    notifications: true,
    darkMode: false,
    language: 'en',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const appReducer = (state: AppState, action: any) => {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(i => i.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(i =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }] };

    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(i => i.id !== action.payload) };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(i =>
          i.id === action.payload.id
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    case 'ADD_TO_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.includes(action.payload)
          ? state.wishlist
          : [...state.wishlist, action.payload],
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.filter(id => id !== action.payload),
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addToCart = (item: CartItem) => dispatch({ type: 'ADD_TO_CART', payload: item });
  const removeFromCart = (id: string) => dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  const updateQuantity = (id: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  return (
    <AppContext.Provider
      value={{ state, dispatch, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
`;
  }

  generateNativeBridge(name) {
    const bridges = {
      ImagePicker: `import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';

interface ImagePickerOptions {
  mediaType: 'photo' | 'video' | 'mixed';
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

export const pickImage = async (options: ImagePickerOptions = {}) => {
  const defaultOptions: ImagePickerOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1024,
    maxHeight: 1024,
    ...options,
  };

  try {
    const result = await launchImageLibrary(defaultOptions);
    if (result.didCancel) {
      return null;
    }
    if (result.errorCode) {
      throw new Error(result.errorMessage);
    }
    return result.assets?.[0] as Asset;
  } catch (error) {
    console.error('Image picker error:', error);
    throw error;
  }
};

export const takePhoto = async (options: ImagePickerOptions = {}) => {
  const defaultOptions: ImagePickerOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1024,
    maxHeight: 1024,
    ...options,
  };

  try {
    const result = await launchCamera(defaultOptions);
    if (result.didCancel) {
      return null;
    }
    if (result.errorCode) {
      throw new Error(result.errorMessage);
    }
    return result.assets?.[0] as Asset;
  } catch (error) {
    console.error('Camera error:', error);
    throw error;
  }
};
`,
      PushNotifications: `import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export const requestPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
};

export const onMessage = (callback: (message: any) => void) => {
  return messaging().onMessage(callback);
};

export const setBackgroundHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background message:', remoteMessage);
  });
};
`,
      Geolocation: `import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
}

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return false;
};

export const getCurrentPosition = (): Promise<Position> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};

export const watchPosition = (
  onSuccess: (position: Position) => void,
  onError?: (error: any) => void
) => {
  return Geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
      });
    },
    onError,
    { enableHighAccuracy: true, distanceFilter: 10 }
  );
};
`
    };

    return bridges[name] || '';
  }

  generateAuthScreen(type) {
    if (type === 'login') {
      return `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = () => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.inputContainer}>
          <Icon name="email-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#8E8E93"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialButton}>
          <Icon name="google" size={20} color="#DB4437" />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Icon name="apple" size={20} color="#000" />
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#000' },
  error: { color: '#FF3B30', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  forgotPassword: { alignItems: 'center', marginTop: 16 },
  forgotText: { color: '#007AFF', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  dividerText: { paddingHorizontal: 16, color: '#8E8E93', fontSize: 13 },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 16, marginBottom: 12 },
  socialButtonText: { marginLeft: 12, fontSize: 16, color: '#000' },
});

export default LoginScreen;
`;
    }

    return `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = () => {
  const { register, loading, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    await register({ name, email, password });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        <View style={styles.inputContainer}>
          <Icon name="account-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor="#8E8E93" />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="email-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#8E8E93" />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#8E8E93" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Icon name="lock-check-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholderTextColor="#8E8E93" />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By signing up, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#000' },
  error: { color: '#FF3B30', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  terms: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 24, lineHeight: 20 },
  link: { color: '#007AFF' },
});

export default RegisterScreen;
`;
  }

  generateHomeScreen() {
    return `import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

const HomeScreen = () => {
  const { state } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [featuredRes, categoriesRes] = await Promise.all([
        api.get('/products/featured'),
        api.get('/categories'),
      ]);
      setFeatured(featuredRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={styles.categoryIcon}>
        <Icon name={item.icon || 'folder'} size={24} color="#007AFF" />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderFeaturedItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.featuredCard}>
      <Image source={{ uri: item.image }} style={styles.featuredImage} />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredTitle}>{item.name}</Text>
        <Text style={styles.featuredPrice}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {state.user?.name || 'Guest'}!</Text>
          <Text style={styles.subGreeting}>What would you like to order today?</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell-outline" size={24} color="#000" />
          {state.notifications?.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{state.notifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <Icon name="magnify" size={20} color="#8E8E93" />
        <Text style={styles.searchPlaceholder}>Search for products...</Text>
      </TouchableOpacity>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featured}
          keyExtractor={(item) => item.id}
          renderItem={renderFeaturedItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        />
      </View>

      {/* Popular */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Near You</Text>
        <View style={styles.popularGrid}>
          {[1, 2, 3, 4].map((i) => (
            <TouchableOpacity key={i} style={styles.popularCard}>
              <View style={styles.popularImagePlaceholder} />
              <Text style={styles.popularName}>Product {i}</Text>
              <Text style={styles.popularPrice}>$99</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#FFFFFF' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  subGreeting: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  notificationButton: { padding: 8 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  searchPlaceholder: { marginLeft: 8, color: '#8E8E93', fontSize: 15 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  seeAll: { color: '#007AFF', fontSize: 14 },
  categoriesList: { paddingHorizontal: 16 },
  categoryItem: { alignItems: 'center', marginRight: 20 },
  categoryIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5E5EA', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryName: { fontSize: 13, color: '#000' },
  featuredList: { paddingHorizontal: 16 },
  featuredCard: { width: 200, marginRight: 16, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  featuredImage: { width: '100%', height: 120, backgroundColor: '#E5E5EA' },
  featuredContent: { padding: 12 },
  featuredTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  featuredPrice: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginTop: 4 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  popularCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginRight: '4%', marginBottom: 12 },
  popularImagePlaceholder: { width: '100%', height: 100, backgroundColor: '#E5E5EA', borderRadius: 8, marginBottom: 8 },
  popularName: { fontSize: 14, fontWeight: '500', color: '#000' },
  popularPrice: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginTop: 4 },
});

export default HomeScreen;
`;
  }

  generateProfileScreen() {
    return `import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: 'account-outline', title: 'Edit Profile', onPress: () => {} },
    { icon: 'map-marker-outline', title: 'Saved Addresses', onPress: () => {} },
    { icon: 'credit-card-outline', title: 'Payment Methods', onPress: () => {} },
    { icon: 'bell-outline', title: 'Notifications', onPress: () => {} },
    { icon: 'shield-outline', title: 'Privacy & Security', onPress: () => {} },
    { icon: 'help-circle-outline', title: 'Help & Support', onPress: () => {} },
    { icon: 'information-outline', title: 'About', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.name || 'Guest User'}</Text>
        <Text style={styles.email}>{user?.email || 'Not signed in'}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Wishlist</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>$450</Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuLeft}>
              <Icon name={item.icon} size={22} color="#007AFF" />
              <Text style={styles.menuText}>{item.title}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Icon name="logout" size={22} color="#FF3B30" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { backgroundColor: '#FFFFFF', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E5EA' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#000', marginTop: 16 },
  email: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  editButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 8, borderWidth: 1, borderColor: '#007AFF', borderRadius: 20 },
  editButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginTop: 10, paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E5E5EA' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  menuContainer: { backgroundColor: '#FFFFFF', marginTop: 20, paddingHorizontal: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, color: '#000', marginLeft: 14 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginTop: 20, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  logoutText: { fontSize: 16, color: '#FF3B30', fontWeight: '600', marginLeft: 8 },
});

export default ProfileScreen;
`;
  }

  generateCartScreen() {
    return `import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../context/AppContext';

const CartScreen = () => {
  const { state, updateQuantity, removeFromCart } = useAppContext();
  const { cart } = state;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.item}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
            <Icon name="minus" size={16} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
            <Icon name="plus" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
        <Icon name="trash-can-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="cart-outline" size={80} color="#C7C7CC" />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity style={styles.shopButton}>
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton}>
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, color: '#8E8E93', marginTop: 16 },
  shopButton: { marginTop: 24, backgroundColor: '#007AFF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  shopButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  list: { padding: 16 },
  item: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12 },
  itemImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#E5E5EA' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#000' },
  itemPrice: { fontSize: 15, color: '#007AFF', fontWeight: '600', marginTop: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  quantityButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  quantity: { fontSize: 16, fontWeight: '600', marginHorizontal: 16 },
  footer: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 16, color: '#8E8E93' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  checkoutButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});

export default CartScreen;
`;
  }

  generateOrderScreen() {
    return `import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const OrderScreen = () => {
  const orders = [
    { id: '1', status: 'delivered', date: '2024-01-15', total: 125.99, items: 3 },
    { id: '2', status: 'processing', date: '2024-01-18', total: 89.50, items: 2 },
    { id: '3', status: 'shipped', date: '2024-01-20', total: 210.00, items: 5 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#34C759';
      case 'shipped': return '#007AFF';
      case 'processing': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.orderDate}>{item.date}</Text>
        <Text style={styles.orderItems}>{item.items} items</Text>
        <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="eye-outline" size={18} color="#007AFF" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="truck-outline" size={18} color="#007AFF" />
          <Text style={styles.actionText}>Track</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="refresh" size={18} color="#007AFF" />
          <Text style={styles.actionText}>Reorder</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="clipboard-text-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '600', color: '#000' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  orderDetails: { flexDirection: 'row', marginTop: 12 },
  orderDate: { fontSize: 14, color: '#8E8E93', flex: 1 },
  orderItems: { fontSize: 14, color: '#8E8E93', marginHorizontal: 12 },
  orderTotal: { fontSize: 14, fontWeight: '600', color: '#000' },
  actions: { flexDirection: 'row', marginTop: 16, borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12 },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 13, color: '#007AFF', marginLeft: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#8E8E93', marginTop: 12 },
});

export default OrderScreen;
`;
  }

  generateSearchScreen() {
    return `import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches] = useState(['Pizza', 'Coffee', 'Burgers', 'Salads']);
  const [categories] = useState([
    { name: 'Restaurants', icon: 'silverware-fork-knife' },
    { name: 'Groceries', icon: 'cart' },
    { name: 'Pharmacy', icon: 'pill' },
    { name: 'Electronics', icon: 'laptop' },
  ]);

  const handleSearch = (text: string) => {
    setQuery(text);
    // Simulated search results
    if (text.length > 2) {
      setResults([
        { id: '1', name: \`\${text} Place 1\`, type: 'restaurant' },
        { id: '2', name: \`\${text} Shop\`, type: 'store' },
        { id: '3', name: \`Best \${text}\`, type: 'restaurant' },
      ]);
    } else {
      setResults([]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for restaurants, products..."
          value={query}
          onChangeText={handleSearch}
          placeholderTextColor="#8E8E93"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Icon name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.content}>
          {/* Categories */}
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat, i) => (
              <TouchableOpacity key={i} style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Icon name={cat.icon} size={24} color="#007AFF" />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Searches */}
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((search, i) => (
            <TouchableOpacity key={i} style={styles.recentItem} onPress={() => handleSearch(search)}>
              <Icon name="history" size={20} color="#8E8E93" />
              <Text style={styles.recentText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem}>
              <Icon name="magnify" size={20} color="#8E8E93" />
              <View style={styles.resultContent}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultType}>{item.type}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No results found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, paddingHorizontal: 16, borderRadius: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: '#000' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 12, marginTop: 8 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  categoryItem: { width: '25%', alignItems: 'center', marginBottom: 16 },
  categoryIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5F0FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  categoryName: { fontSize: 12, color: '#000', textAlign: 'center' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  recentText: { fontSize: 15, color: '#000', marginLeft: 12 },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  resultContent: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 16, color: '#000' },
  resultType: { fontSize: 13, color: '#8E8E93', textTransform: 'capitalize' },
  noResults: { alignItems: 'center', paddingVertical: 60 },
  noResultsText: { fontSize: 16, color: '#8E8E93' },
});

export default SearchScreen;
`;
  }

  generateMapScreen() {
    return `import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { requestLocationPermission, getCurrentPosition } from '../native/Geolocation';

const MapScreen = () => {
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      try {
        const position = await getCurrentPosition();
        setRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        // Add nearby markers
        setMarkers([
          { id: '1', latitude: position.latitude + 0.01, longitude: position.longitude + 0.01, title: 'Store 1' },
          { id: '2', latitude: position.latitude - 0.01, longitude: position.longitude - 0.01, title: 'Store 2' },
        ]);
      } catch (error) {
        console.error('Location error:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            onPress={() => setSelectedMarker(marker)}
          />
        ))}
      </MapView>

      {/* Search Bar Overlay */}
      <View style={styles.searchOverlay}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#8E8E93" />
          <Text style={styles.searchPlaceholder}>Search location...</Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      {selectedMarker && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{selectedMarker.title}</Text>
          <Text style={styles.sheetSubtitle}>Tap for more details</Text>
          <TouchableOpacity style={styles.directionButton}>
            <Icon name="directions" size={20} color="#FFFFFF" />
            <Text style={styles.directionText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={initializeMap}>
          <Icon name="crosshairs-gps" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Icon name="layers" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchOverlay: { position: 'absolute', top: 50, left: 16, right: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  searchPlaceholder: { marginLeft: 8, fontSize: 16, color: '#8E8E93' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#C7C7CC', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  sheetSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  directionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', borderRadius: 12, padding: 14, marginTop: 16 },
  directionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  controls: { position: 'absolute', right: 16, bottom: selectedMarker ? 200 : 100 },
  controlButton: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
});

export default MapScreen;
`;
  }

  generateConstants() {
    return `export const API_BASE_URL = __DEV__
  ? 'http://localhost:4001/api'
  : 'https://api.${this.projectName?.toLowerCase() || 'app'}.com/api';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  SETTINGS: 'settings',
  CART: 'cart',
  WISHLIST: 'wishlist',
};

export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};
`;
  }

  generateTheme() {
    return `import { COLORS, SPACING, BORDER_RADIUS } from './constants';

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,

  // Button styles
  button: {
    primary: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: COLORS.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: BORDER_RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },

  // Input styles
  input: {
    container: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: BORDER_RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.surface,
    },
    focused: {
      borderColor: COLORS.primary,
    },
  },

  // Card styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};

export type Theme = typeof theme;
`;
  }

  generateHelpers() {
    return `export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
};

export const formatTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const re = /^[\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/;
  return re.test(phone);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
};
`;
  }

  generateValidation() {
    return `export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email' };
  }
  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }
  return { valid: true };
};

export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4,6}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }
  return { valid: true };
};

export const validateRequired = (value: string, fieldName: string): { valid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, error: \`\${fieldName} is required\` };
  }
  return { valid: true };
};

export const validateLength = (
  value: string,
  fieldName: string,
  min: number,
  max: number
): { valid: boolean; error?: string } => {
  if (value.length < min) {
    return { valid: false, error: \`\${fieldName} must be at least \${min} characters\` };
  }
  if (value.length > max) {
    return { valid: false, error: \`\${fieldName} must be at most \${max} characters\` };
  }
  return { valid: true };
};

export const validateMatch = (
  value: string,
  matchValue: string,
  fieldName: string
): { valid: boolean; error?: string } => {
  if (value !== matchValue) {
    return { valid: false, error: \`\${fieldName} does not match\` };
  }
  return { valid: true };
};
`;
  }

  generateBabelConfig() {
    return `module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
  ],
};
`;
  }

  generateTSConfig() {
    return `{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
`;
  }

  generateMetroConfig() {
    return `const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
`;
  }

  generateIOSPodfile() {
    return `require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, min_ios_version_supported
prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target '${this.projectName}' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
end
`;
  }
}

export default ReactNativeGenerator;
