import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: ${envVar} is not set. Using default value.`);
  }
}

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4700', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: `/api/${process.env.API_VERSION || 'v1'}`,

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-clinic',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 2,
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'hojai-clinic:',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // RABTUL Services
  rabbit: {
    authUrl: process.env.RABTUL_AUTH_URL || 'http://localhost:4000',
    walletUrl: process.env.RABTUL_WALLET_URL || 'http://localhost:4001',
    paymentUrl: process.env.RABTUL_PAYMENT_URL || 'http://localhost:4002',
    notificationUrl: process.env.RABTUL_NOTIFICATION_URL || 'http://localhost:4003',
  },

  // WhatsApp
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    apiKey: process.env.TWILIO_API_KEY || '',
    apiSecret: process.env.TWILIO_API_SECRET || '',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },

  // ABHA
  abha: {
    apiUrl: process.env.ABHA_API_URL || 'https://abha.abdm.gov.in/abha/v3',
    clientId: process.env.ABHA_CLIENT_ID || '',
    clientSecret: process.env.ABHA_CLIENT_SECRET || '',
  },

  // Storage
  storage: {
    bucket: process.env.S3_BUCKET || 'hojai-clinic-ai',
    region: process.env.S3_REGION || 'ap-south-1',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    endpoint: process.env.S3_ENDPOINT || '',
  },

  // Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@hojai.ai',
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'fast2sms',
    apiKey: process.env.SMS_API_KEY || '',
  },

  // Clinic Settings
  clinic: {
    defaultName: process.env.DEFAULT_CLINIC_NAME || 'My Clinic',
    workingHoursStart: process.env.DEFAULT_WORKING_HOURS_START || '09:00',
    workingHoursEnd: process.env.DEFAULT_WORKING_HOURS_END || '18:00',
    slotDurationMinutes: parseInt(process.env.SLOT_DURATION_MINUTES || '30', 10),
    maxDailyAppointments: parseInt(process.env.MAX_DAILY_APPOINTMENTS || '50', 10),
  },

  // AI Configuration
  ai: {
    receptionistWelcome: process.env.AI_RECEPTIONIST_WELCOME_MESSAGE || 'Namaste! Welcome to our clinic. How can I help you today?',
    receptionistLanguage: process.env.AI_RECEPTIONIST_LANGUAGE || 'hi',
    voiceEngine: process.env.AI_VOICE_ENGINE || 'google',
    responseDelayMs: parseInt(process.env.AI_RESPONSE_DELAY_MS || '500', 10),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '/var/log/hojai-clinic-ai.log',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
};

export default config;
