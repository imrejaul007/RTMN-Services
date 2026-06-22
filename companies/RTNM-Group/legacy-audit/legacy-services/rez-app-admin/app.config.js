const config = {
  expo: {
    name: "Rez Admin",
    slug: "rez-admin-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rez-admin",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#DC2626"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rez.admin",
      associatedDomains: ['applinks:admin.rez.money'],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#DC2626"
      },
      package: "com.rez.admin",
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'admin.rez.money' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '71e8a58b-aaec-472a-aba6-4afd001576fb'}`,
      enabled: true,
      fallbackToCacheTimeout: 0,
      requestHeaders: {
        'expo-channel-name': process.env.EXPO_PUBLIC_CHANNEL || 'production',
      },
    },
    runtimeVersion: process.env.EXPO_RUNTIME_VERSION || '1.0.0',
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#DC2626"
        }
      ],
      // Sentry plugin only for native builds — skip on web/Vercel
      ...(process.env.VERCEL ? [] : [["@sentry/react-native/expo", { "organization": "rez-money", "project": "rez-admin" }]]),
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      // No fallback URLs — build will fail loudly if EXPO_PUBLIC_API_BASE_URL is not set.
      // Set production URLs via EAS Secrets or your CI environment.
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT || '60000',
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
      socketTimeout: process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '5000',
      eas: {
        projectId: "71e8a58b-aaec-472a-aba6-4afd001576fb"
      }
    }
  }
};

export default config;
