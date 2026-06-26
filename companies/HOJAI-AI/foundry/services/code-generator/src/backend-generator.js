/**
 * HOJAI Backend API Generator
 * Generates complete Express.js backend with MongoDB models, routes, controllers, and middleware
 */

import { mkdirSync, writeFileSync } from 'fs';

// Template-specific backend configurations
const TEMPLATE_CONFIGS = {
  ecommerce: {
    name: 'E-Commerce',
    models: ['Product', 'Category', 'Order', 'User', 'Cart', 'Review', 'Address', 'Payment', 'Coupon', 'Wishlist'],
    routes: ['auth', 'products', 'categories', 'orders', 'cart', 'users', 'reviews', 'payments', 'coupons', 'search'],
    middleware: ['auth', 'admin', 'rateLimit', 'validate'],
    features: ['jwt-auth', 'admin-panel', 'inventory', 'analytics', 'notifications']
  },
  'food-delivery': {
    name: 'Food Delivery',
    models: ['Restaurant', 'MenuItem', 'Order', 'User', 'Driver', 'Address', 'Review', 'Payment', 'Coupon', 'Notification'],
    routes: ['auth', 'restaurants', 'menu', 'orders', 'drivers', 'reviews', 'payments', 'tracking', 'notifications'],
    middleware: ['auth', 'driver', 'restaurant', 'rateLimit', 'validate'],
    features: ['real-time-tracking', 'driver-app', 'restaurant-dashboard', 'multi-cuisine', 'offers']
  },
  mobility: {
    name: 'Mobility',
    models: ['Ride', 'Driver', 'Vehicle', 'User', 'Payment', 'Coupon', 'Location', 'Review', 'Dispute'],
    routes: ['auth', 'rides', 'drivers', 'vehicles', 'payments', 'tracking', 'reviews', 'disputes', 'surge'],
    middleware: ['auth', 'driver', 'passenger', 'rateLimit', 'validate'],
    features: ['real-time-tracking', 'surge-pricing', 'driver-matching', 'safety-features', 'corporate']
  },
  healthcare: {
    name: 'Healthcare',
    models: ['Doctor', 'Patient', 'Appointment', 'Prescription', 'Record', 'Review', 'Payment', 'Specialty', 'Clinic'],
    routes: ['auth', 'doctors', 'appointments', 'prescriptions', 'records', 'reviews', 'payments', 'specialties', 'clinics'],
    middleware: ['auth', 'doctor', 'patient', 'rateLimit', 'validate', 'hipaa'],
    features: ['telemedicine', 'e-prescriptions', 'health-records', 'appointment-reminders', 'insurance']
  },
  education: {
    name: 'Education',
    models: ['Course', 'Lesson', 'Enrollment', 'Certificate', 'User', 'Instructor', 'Review', 'Payment', 'Progress', 'Assignment'],
    routes: ['auth', 'courses', 'lessons', 'enrollments', 'certificates', 'instructors', 'reviews', 'progress', 'assignments'],
    middleware: ['auth', 'instructor', 'student', 'rateLimit', 'validate'],
    features: ['video-streaming', 'certificates', 'progress-tracking', 'assessments', 'certifications']
  },
  fintech: {
    name: 'Fintech',
    models: ['Account', 'Transaction', 'Card', 'Investment', 'User', 'Beneficiary', 'KYC', 'Loan', 'Insurance'],
    routes: ['auth', 'accounts', 'transactions', 'transfers', 'investments', 'cards', 'kyc', 'loans', 'insurance'],
    middleware: ['auth', 'banker', 'rateLimit', 'validate', 'fraud'],
    features: ['multi-currency', 'investments', 'loans', 'insurance', 'analytics']
  },
  ota: {
    name: 'Online Travel Agency',
    models: ['Hotel', 'Flight', 'Booking', 'User', 'Review', 'Payment', 'Destination', 'Package', 'Transfer'],
    routes: ['auth', 'hotels', 'flights', 'bookings', 'reviews', 'payments', 'destinations', 'packages', 'transfers'],
    middleware: ['auth', 'admin', 'rateLimit', 'validate'],
    features: ['hotel-booking', 'flight-search', 'packages', 'insurance', 'cancellations']
  },
  logistics: {
    name: 'Logistics',
    models: ['Shipment', 'Warehouse', 'Route', 'User', 'Driver', 'Vehicle', 'Package', 'Tracking', 'Cost'],
    routes: ['auth', 'shipments', 'warehouses', 'routes', 'drivers', 'tracking', 'costs', 'reports'],
    middleware: ['auth', 'admin', 'driver', 'rateLimit', 'validate'],
    features: ['real-time-tracking', 'route-optimization', 'multi-modal', 'customs', 'insurance']
  },
  restaurant: {
    name: 'Restaurant',
    models: ['Restaurant', 'MenuItem', 'Order', 'Table', 'Bill', 'User', 'Kitchen', 'Ingredient', 'Report'],
    routes: ['auth', 'menu', 'orders', 'tables', 'bills', 'kitchen', 'reports', 'inventory'],
    middleware: ['auth', 'manager', 'staff', 'rateLimit', 'validate'],
    features: ['pos-system', 'kds', 'table-management', 'inventory', 'analytics']
  },
  marketplace: {
    name: 'Marketplace',
    models: ['Product', 'Seller', 'Buyer', 'Order', 'Review', 'Dispute', 'Payment', 'Category', 'Commission'],
    routes: ['auth', 'products', 'sellers', 'buyers', 'orders', 'reviews', 'disputes', 'payments', 'commissions'],
    middleware: ['auth', 'seller', 'buyer', 'rateLimit', 'validate'],
    features: ['escrow', 'disputes', 'commissions', 'ratings', 'verification']
  }
};

/**
 * Generate complete Backend API
 */
export function generateBackendAPI(template, companyName, outputPath) {
  const config = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS.ecommerce;
  const files = [];
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // 1. package.json with all dependencies
  files.push({
    path: 'package.json',
    content: generatePackageJson(slug, config)
  });

  // 2. Main server entry point
  files.push({
    path: 'src/index.js',
    content: generateServerEntry(slug, config)
  });

  // 3. Express app setup
  files.push({
    path: 'src/app.js',
    content: generateExpressApp(config)
  });

  // 4. Environment config
  files.push({
    path: 'src/config/index.js',
    content: generateConfig(config)
  });

  // 5. Database connection
  files.push({
    path: 'src/config/database.js',
    content: generateDatabaseConfig()
  });

  // 6. Models
  for (const model of config.models) {
    files.push({
      path: `src/models/${model}.js`,
      content: generateModel(model, config)
    });
  }

  // 7. Routes
  for (const route of config.routes) {
    files.push({
      path: `src/routes/${route}.js`,
      content: generateRoute(route, config)
    });
  }

  // 8. Controllers
  for (const route of config.routes) {
    files.push({
      path: `src/controllers/${route}Controller.js`,
      content: generateController(route, config)
    });
  }

  // 9. Middleware
  for (const mw of config.middleware) {
    files.push({
      path: `src/middleware/${mw}.js`,
      content: generateMiddleware(mw, config)
    });
  }

  // 10. Utils
  files.push({
    path: 'src/utils/response.js',
    content: generateResponseUtils()
  });
  files.push({
    path: 'src/utils/errors.js',
    content: generateErrorUtils()
  });
  files.push({
    path: 'src/utils/validators.js',
    content: generateValidators()
  });

  // 11. Docker setup
  files.push({
    path: 'Dockerfile',
    content: generateDockerfile(slug)
  });
  files.push({
    path: 'docker-compose.yml',
    content: generateDockerCompose(slug)
  });
  files.push({
    path: '.dockerignore',
    content: generateDockerIgnore()
  });

  // 12. Environment example
  files.push({
    path: '.env.example',
    content: generateEnvExample(config)
  });

  // 13. Git ignore
  files.push({
    path: '.gitignore',
    content: generateGitIgnore()
  });

  // 14. README
  files.push({
    path: 'README.md',
    content: generateReadme(slug, config)
  });

  // 15. Test setup
  files.push({
    path: 'src/__tests__/setup.js',
    content: generateTestSetup()
  });
  files.push({
    path: `src/__tests__/routes/${config.routes[0]}.test.js`,
    content: generateRouteTest(config.routes[0])
  });

  return files;
}

function generatePackageJson(slug, config) {
  return JSON.stringify({
    name: `${slug}-api`,
    version: '1.0.0',
    description: `${config.name} Backend API - Generated by HOJAI Studio`,
    main: 'src/index.js',
    type: 'module',
    scripts: {
      start: 'node src/index.js',
      dev: 'nodemon src/index.js',
      test: 'node --experimental-vm-modules node_modules/jest/bin/jest.js',
      test:watch: 'node --experimental-vm-modules node_modules/jest/bin/jest.js --watch',
      lint: 'eslint src/',
      format: 'prettier --write "src/**/*.js"'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.1.0',
      compression: '^1.7.4',
      mongoose: '^8.0.0',
      dotenv: '^16.3.1',
      'express-rate-limit': '^7.1.5',
      'rate-limit-redis': '^4.2.0',
      'jsonwebtoken': '^9.0.2',
      bcryptjs: '^2.4.3',
      'express-validator': '^7.0.1',
      'morgan': '^1.10.0',
      'winston': '^3.11.0',
      'multer': '^1.4.5-lts.1',
      'cloudinary': '^2.0.0',
      'uuid': '^9.0.1',
      'node-cron': '^3.0.3',
      'socket.io': '^4.7.2',
      'ioredis': '^5.3.2',
      'node-fetch': '^3.3.2'
    },
    devDependencies: {
      nodemon: '^3.0.2',
      jest: '^29.7.0',
      'jest-mongodb': '^4.12.0',
      'supertest': '^6.3.3',
      eslint: '^8.56.0',
      prettier: '^3.1.1'
    },
   engines: {
      node: '>=18.0.0'
    }
  }, null, 2);
}

function generateServerEntry(slug, config) {
  return `/**
 * ${config.name} Backend API
 * Generated by HOJAI Studio
 *
 * @prefix /api/v1
 */
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/database.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3000;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

// Connect to database and start server
async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(\`
╔═══════════════════════════════════════════════════════════════╗
║                    ${config.name.toUpperCase()} API                           ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server running on port \${PORT}                        ║
║  🌐 Environment: \${process.env.NODE_ENV || 'development'}                      ║
║  📚 API Docs: http://localhost:\${PORT}/api/v1/docs          ║
╚═══════════════════════════════════════════════════════════════╝
      \`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(\`\${signal} signal received. Shutting down gracefully...\`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
`;
}

function generateExpressApp(config) {
  return `/**
 * Express Application Setup
 * Generated by HOJAI Studio
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import logger from './utils/logger.js';

// Import routes
${config.routes.map(r => `import ${r}Router from './routes/${r}.js';`).join('\n')}

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: '${config.name}'
  });
});

// API routes
app.use('/api/v1/auth', authRouter);
${config.routes.filter(r => r !== 'auth').map(r => `app.use('/api/v1/${r}', ${r}Router);`).join('\n')}

// API documentation endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: '${config.name} API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      ${config.routes.filter(r => r !== 'auth').map(r => `${r}: '/api/v1/${r}'`).join(',\n      ')}
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
`;
}

function generateConfig(config) {
  return `/**
 * Application Configuration
 * Generated by HOJAI Studio
 */
export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/${config.name.toLowerCase().replace(/\\s+/g, '_')}'
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Email (SendGrid)
  email: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@${config.name.toLowerCase().replace(/\\s+/g, '')}.com'
  },

  // SMS (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};
`;
}

function generateDatabaseConfig() {
  return `/**
 * MongoDB Database Connection
 * Generated by HOJAI Studio
 */
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(\`MongoDB Connected: \${conn.connection.host}\`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export { connectDB };
`;
}

function generateModel(modelName, config) {
  const schemaFields = getModelFields(modelName);

  return `/**
 * ${modelName} Model
 * Generated by HOJAI Studio
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ${modelName.toLowerCase()}Schema = new mongoose.Schema(
  {
    ${schemaFields.fields}
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
${schemaFields.indexes}

// Pre-save hooks
${schemaFields.hooks}

// Methods
${schemaFields.methods}

// Statics
${schemaFields.statics}

const ${modelName} = mongoose.model('${modelName}', ${modelName.toLowerCase()}Schema);

export default ${modelName};
`;
}

function getModelFields(modelName) {
  const schemas = {
    User: {
      fields: `name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true, minlength: 6 },
      phone: { type: String },
      avatar: { type: String },
      role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
      isActive: { type: Boolean, default: true },
      lastLogin: Date,
      addresses: [{
        type: { type: String, enum: ['home', 'work', 'other'] },
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' },
        isDefault: { type: Boolean, default: false }
      }],
      refreshToken: String`,
      indexes: `
// Indexes
${modelName.toLowerCase()}Schema.index({ email: 1 });
${modelName.toLowerCase()}Schema.index({ role: 1 });`,
      hooks: `
// Hash password before saving
${modelName.toLowerCase()}Schema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});`,
      methods: `
// Compare password
${modelName.toLowerCase()}Schema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON
${modelName.toLowerCase()}Schema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};`,
      statics: `
${modelName.toLowerCase()}Schema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};`
    },
    Product: {
      fields: `name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true, min: 0 },
      salePrice: { type: Number, min: 0 },
      images: [{ type: String }],
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      subcategory: String,
      brand: String,
      sku: { type: String, unique: true },
      stock: { type: Number, default: 0, min: 0 },
      unit: { type: String, default: 'piece' },
      weight: Number,
      dimensions: {
        length: Number, width: Number, height: Number
      },
      isActive: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
      tags: [String],
      attributes: mongoose.Schema.Types.Mixed,
      rating: { type: Number, default: 0, min: 0, max: 5 },
      numReviews: { type: Number, default: 0 }`,
      indexes: `
${modelName.toLowerCase()}Schema.index({ name: 'text', description: 'text' });
${modelName.toLowerCase()}Schema.index({ category: 1, price: 1 });
${modelName.toLowerCase()}Schema.index({ isActive: 1, isFeatured: 1 });`,
      hooks: '',
      methods: `
${modelName.toLowerCase()}Schema.methods.getFinalPrice = function() {
  return this.salePrice || this.price;
};`,
      statics: `
${modelName.toLowerCase()}Schema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isActive: true });
};`
    },
    Order: {
      fields: `orderNumber: { type: String, unique: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: { type: Number, required: true, min: 1 },
        total: Number
      }],
      subtotal: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      shippingCost: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
      },
      paymentMethod: String,
      shippingAddress: {
        name: String, phone: String, street: String,
        city: String, state: String, pincode: String, country: String
      },
      billingAddress: {
        name: String, phone: String, street: String,
        city: String, state: String, pincode: String, country: String
      },
      notes: String,
      estimatedDelivery: Date,
      deliveredAt: Date,
      trackingNumber: String`,
      indexes: `
${modelName.toLowerCase()}Schema.index({ user: 1, createdAt: -1 });
${modelName.toLowerCase()}Schema.index({ status: 1 });
${modelName.toLowerCase()}Schema.index({ orderNumber: 1 });`,
      hooks: `
${modelName.toLowerCase()}Schema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const count = await mongoose.model('Order').countDocuments({
      createdAt: { $gte: new Date(date.setHours(0,0,0,0)) }
    });
    this.orderNumber = \`ORD\${date.getFullYear()}\${String(date.getMonth()+1).padStart(2,'0')}\${String(count+1).padStart(5,'0')}\`;
  }
  next();
});`,
      methods: '',
      statics: `
${modelName.toLowerCase()}Schema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    { $group: {
      _id: null,
      totalOrders: { $sum: 1 },
      totalSpent: { $sum: '$total' },
      avgOrderValue: { $avg: '$total' }
    }}
  ]);
};`
    },
    Restaurant: {
      fields: `name: { type: String, required: true },
      description: String,
      image: String,
      coverImage: String,
      cuisine: [String],
      address: {
        street: String, city: String, state: String,
        pincode: String, country: { type: String, default: 'India' }
      },
      location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] },
      phone: String,
      email: String,
      website: String,
      operatingHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
      },
      isOpen: { type: Boolean, default: true },
      isActive: { type: Boolean, default: true },
      rating: { type: Number, default: 0, min: 0, max: 5 },
      numReviews: { type: Number, default: 0 },
      minOrder: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      estimatedDeliveryTime: { type: Number, default: 30 }, // minutes
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`,
      indexes: `
${modelName.toLowerCase()}Schema.index({ location: '2dsphere' });
${modelName.toLowerCase()}Schema.index({ cuisine: 1 });
${modelName.toLowerCase()}Schema.index({ isActive: 1, isOpen: 1 });`,
      hooks: '',
      methods: `
${modelName.toLowerCase()}Schema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
  const hours = this.operatingHours[day];
  if (!hours || !hours.open || !hours.close) return this.isOpen;
  const current = now.getHours() * 60 + now.getMinutes();
  const open = parseInt(hours.open.split(':')[0]) * 60 + parseInt(hours.open.split(':')[1]);
  const close = parseInt(hours.close.split(':')[0]) * 60 + parseInt(hours.close.split(':')[1]);
  return current >= open && current <= close && this.isOpen;
};`,
      statics: `
${modelName.toLowerCase()}Schema.statics.findNearby = function(longitude, latitude, radiusKm = 5) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusKm * 1000
      }
    },
    isActive: true,
    isOpen: true
  });
};`
    },
    default: {
      fields: `name: { type: String, required: true },
      description: String,
      isActive: { type: Boolean, default: true },
      status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' }`,
      indexes: '',
      hooks: '',
      methods: '',
      statics: ''
    }
  };

  return schemas[modelName] || schemas.default;
}

function generateRoute(routeName, config) {
  return `/**
 * ${routeName} Routes
 * Generated by HOJAI Studio
 */
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { getAll, getOne, create, update, remove } from '../controllers/${routeName}Controller.js';

const router = express.Router();

// Validation rules
const validateId = [param('id').isMongoId().withMessage('Invalid ID'), validate];

const createValidation = [
  ${getValidationRules(routeName)}
  , validate
];

// Routes
router.route('/')
  .get(protect, getAll)
  .post(protect, createValidation, create);

router.route('/:id')
  .get(protect, validateId, getOne)
  .put(protect, validateId, createValidation, update)
  .delete(protect, validateId, remove);

export default router;
`;
}

function getValidationRules(routeName) {
  const rules = {
    auth: `body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })`,
    products: `body('name').notEmpty().trim(),
  body('price').isFloat({ min: 0 })`,
    orders: `body('items').isArray({ min: 1 })`,
    users: `body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail()`,
    restaurants: `body('name').notEmpty().trim(),
  body('address').notEmpty()`,
    default: ''
  };
  return rules[routeName] || rules.default;
}

function generateController(routeName, config) {
  return `/**
 * ${routeName} Controller
 * Generated by HOJAI Studio
 */
import ${capitalize(routeName)} from '../models/${capitalize(routeName)}.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { catchAsync } from '../utils/errors.js';

// Get all ${routeName}
export const getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, sort = '-createdAt', ...filters } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [data, total] = await Promise.all([
    ${capitalize(routeName)}.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate(req.query.populate || ''),
    ${capitalize(routeName)}.countDocuments(filters)
  ]);

  res.json(successResponse({
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get single ${routeName}
export const getOne = catchAsync(async (req, res, next) => {
  const item = await ${capitalize(routeName)}.findById(req.params.id).populate(req.query.populate || '');

  if (!item) {
    return next(new AppError('${routeName.slice(0, -1)} not found', 404));
  }

  res.json(successResponse(item));
});

// Create ${routeName}
export const create = catchAsync(async (req, res, next) => {
  const item = await ${capitalize(routeName)}.create(req.body);
  res.status(201).json(successResponse(item));
});

// Update ${routeName}
export const update = catchAsync(async (req, res, next) => {
  const item = await ${capitalize(routeName)}.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!item) {
    return next(new AppError('${routeName.slice(0, -1)} not found', 404));
  }

  res.json(successResponse(item));
});

// Delete ${routeName}
export const remove = catchAsync(async (req, res, next) => {
  const item = await ${capitalize(routeName)}.findByIdAndDelete(req.params.id);

  if (!item) {
    return next(new AppError('${routeName.slice(0, -1)} not found', 404));
  }

  res.json(successResponse(null, '${routeName.slice(0, -1)} deleted successfully'));
});
`;
}

function generateMiddleware(mwName, config) {
  const middlewares = {
    auth: `/**
 * Authentication Middleware
 * Generated by HOJAI Studio
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';
import config from '../config/index.js';

export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('You are not logged in. Please log in to access.', 401);
  }

  const decoded = jwt.verify(token, config.jwt.secret);

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated', 401);
  }

  req.user = user;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
`,
    admin: `/**
 * Admin Middleware
 * Generated by HOJAI Studio
 */
import { restrictTo } from './auth.js';

export const adminOnly = restrictTo('admin');
export const managerOrAdmin = restrictTo('admin', 'manager');
`,
    rateLimit: `/**
 * Rate Limiting Middleware
 * Generated by HOJAI Studio
 */
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many login attempts, please try again after an hour.' }
});
`,
    validate: `/**
 * Validation Middleware
 * Generated by HOJAI Studio
 */
import { validationResult } from 'express-validator';
import { AppError } from '../utils/errors.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map(e => e.msg).join(', ');
    return next(new AppError(message, 400));
  }
  next();
};
`,
    errorHandler: `/**
 * Global Error Handler
 * Generated by HOJAI Studio
 */
import config from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.env === 'development') {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else if (config.env === 'production') {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        success: false,
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }
};
`,
    notFound: `/**
 * Not Found Handler
 * Generated by HOJAI Studio
 */
import { AppError } from '../utils/errors.js';

export const notFound = (req, res, next) => {
  next(new AppError(\`Can't find \${req.originalUrl} on this server\`, 404));
};
`,
    fraud: `/**
 * Fraud Detection Middleware
 * Generated by HOJAI Studio
 */
import { AppError } from '../utils/errors.js';

export const checkFraud = catchAsync(async (req, res, next) => {
  // Implement fraud detection logic
  // Check for suspicious patterns, velocity limits, etc.
  next();
});
`
  };

  return middlewares[mwName] || `// ${mwName} middleware placeholder\nexport default (req, res, next) => next();`;
}

function generateResponseUtils() {
  return `/**
 * Response Utilities
 * Generated by HOJAI Studio
 */
export const successResponse = (data, message = 'Success', statusCode = 200) => ({
  success: true,
  message,
  data
});

export const createdResponse = (data, message = 'Created successfully') => ({
  success: true,
  message,
  data
});

export const paginatedResponse = ({ data, page, limit, total, message = 'Success' }) => ({
  success: true,
  message,
  data,
  pagination: { page, limit, total, pages: Math.ceil(total / limit) }
});
`;
}

function generateErrorUtils() {
  return `/**
 * Error Utilities
 * Generated by HOJAI Studio
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = \`\${statusCode}\`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
`;
}

function generateValidators() {
  return `/**
 * Validation Rules
 * Generated by HOJAI Studio
 */
import { body, param, query } from 'express-validator';

export const mongoIdParam = [
  param('id').isMongoId().withMessage('Invalid ID parameter')
];

export const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
];

export const emailValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

export const passwordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\\d/)
    .withMessage('Password must contain a number')
];
`;
}

function generateDockerfile(slug) {
  return `# ${slug} API Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder /app/node_modules ./node_modules
COPY ./src ./src

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
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
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/${slug}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=\${JWT_SECRET}
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
`;
}

function generateDockerIgnore() {
  return `node_modules
npm-debug.log
.env
.env.*
!.env.example
.git
.gitignore
README.md
coverage
.nyc_output
*.test.js
__tests__
`;
}

function generateEnvExample(config) {
  return `# ${config.name} Backend API Environment Variables
# Generated by HOJAI Studio

# Server
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database
MONGODB_URI=mongodb://localhost:27017/${config.name.toLowerCase().replace(/\\s+/g, '_')}

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (SendGrid)
SENDGRID_API_KEY=
FROM_EMAIL=noreply@example.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# AWS S3 (for backups)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_BUCKET=

# Logging
LOG_LEVEL=info
`;
}

function generateGitIgnore() {
  return `# Dependencies
node_modules/
package-lock.json

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Build
dist/
build/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Misc
*.tgz
*.tar.gz
`;
}

function generateReadme(slug, config) {
  return `# ${config.name} Backend API

Generated by **HOJAI Studio** - Build any agentic company in 30 minutes.

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middleware/        # Express middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── utils/           # Utility functions
└── __tests__/       # Tests
\`\`\`

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
${config.routes.map(r => `| GET/POST | /api/v1/${r} | ${r} endpoints |`).join('\n')}

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT with bcrypt
- **Validation:** express-validator
- **Logging:** Winston + Morgan

## 📦 Generated Files

- ${config.models.length} Models: ${config.models.join(', ')}
- ${config.routes.length} Route handlers
- Full Docker + Kubernetes deployment configs
- Test scaffolding

---
*Built with ❤️ by HOJAI Studio*
`;
}

function generateTestSetup() {
  return `/**
 * Test Setup
 * Generated by HOJAI Studio
 */
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});
`;
}

function generateRouteTest(routeName) {
  return `/**
 * ${routeName} Route Tests
 * Generated by HOJAI Studio
 */
import request from 'supertest';
import app from '../../app.js';

describe('${routeName.toUpperCase()} API', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token for protected routes
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.body.token;
  });

  describe('GET /api/v1/${routeName}', () => {
    it('should return list of ${routeName}', async () => {
      const res = await request(app)
        .get('/api/v1/${routeName}')
        .set('Authorization', \`Bearer \${authToken}\`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/${routeName}?page=1&limit=10')
        .set('Authorization', \`Bearer \${authToken}\`);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/v1/${routeName}', () => {
    it('should create a new ${routeName.slice(0, -1)}', async () => {
      const res = await request(app)
        .post('/api/v1/${routeName}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .send({ name: 'Test ${routeName.slice(0, -1)}' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
