import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';

import config from './config';
import { errorHandler, notFoundHandler } from './middleware';
import {
  patientRoutes,
  appointmentRoutes,
  prescriptionRoutes,
  aiRoutes,
  whatsAppRoutes,
  analyticsRoutes,
} from './routes';
import { Appointment, Patient, CarePlan } from './models';
import { whatsAppService } from './services';

class Application {
  public app: Express;
  public httpServer: ReturnType<typeof createServer>;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeCronJobs();
    this.connectToDatabase();
  }

  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        error: 'Too many requests, please try again later.',
      },
    });
    this.app.use('/api/', limiter);

    // Swagger documentation
    const swaggerOptions: swaggerJsdoc.Options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'HOJAI Clinic AI API',
          version: '1.0.0',
          description: 'AI-powered healthcare operating system API',
          contact: {
            name: 'HOJAI Support',
            email: 'support@hojai.ai',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ['./src/routes/*.ts'],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
      });
    });

    // API routes
    const apiPrefix = config.apiPrefix;

    this.app.use(`${apiPrefix}/patients`, patientRoutes);
    this.app.use(`${apiPrefix}/appointments`, appointmentRoutes);
    this.app.use(`${apiPrefix}/prescriptions`, prescriptionRoutes);
    this.app.use(`${apiPrefix}/ai`, aiRoutes);
    this.app.use(`${apiPrefix}/whatsapp`, whatsAppRoutes);
    this.app.use(`${apiPrefix}/analytics`, analyticsRoutes);

    // Clinic routes (basic CRUD)
    this.app.use(`${apiPrefix}/clinics`, require('./routes/clinic.routes').default);
    this.app.use(`${apiPrefix}/doctors`, require('./routes/doctor.routes').default);

    // Error handlers
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join clinic room
      socket.on('join-clinic', (clinicId: string) => {
        socket.join(`clinic:${clinicId}`);
        console.log(`Socket ${socket.id} joined clinic:${clinicId}`);
      });

      // Leave clinic room
      socket.on('leave-clinic', (clinicId: string) => {
        socket.leave(`clinic:${clinicId}`);
        console.log(`Socket ${socket.id} left clinic:${clinicId}`);
      });

      // Real-time appointment updates
      socket.on('appointment-update', (data: {
        clinicId: string;
        appointmentId: string;
        action: 'create' | 'update' | 'cancel';
      }) => {
        this.io.to(`clinic:${data.clinicId}`).emit('appointment-changed', data);
      });

      // Real-time patient updates
      socket.on('patient-update', (data: {
        clinicId: string;
        patientId: string;
        action: 'create' | 'update';
      }) => {
        this.io.to(`clinic:${data.clinicId}`).emit('patient-changed', data);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private initializeCronJobs(): void {
    // Send appointment reminders at 9 AM daily
    cron.schedule('0 9 * * *', async () => {
      console.log('Running appointment reminder job...');
      await this.sendAppointmentReminders();
    });

    // Check for overdue care plan tasks at 10 AM daily
    cron.schedule('0 10 * * *', async () => {
      console.log('Checking for overdue care plan tasks...');
      await this.checkOverdueTasks();
    });

    // Generate daily reports at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('Generating daily reports...');
      // Report generation logic would go here
    });

    // Clean up old reminders at 1 AM daily
    cron.schedule('0 1 * * *', async () => {
      console.log('Cleaning up old reminders...');
      await this.cleanupOldReminders();
    });
  }

  private async sendAppointmentReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    try {
      const appointments = await Appointment.find({
        date: { $gte: tomorrow, $lt: dayAfterTomorrow },
        status: { $in: ['scheduled', 'confirmed'] },
      })
        .populate('patientId', 'firstName lastName phone')
        .populate('doctorId', 'name')
        .populate('clinicId', 'name');

      for (const appointment of appointments) {
        const patient = appointment.patientId as any;
        const doctor = appointment.doctorId as any;
        const clinic = appointment.clinicId as any;

        if (patient?.phone && whatsAppService.isConfigured()) {
          try {
            await whatsAppService.sendAppointmentReminder(
              patient.phone,
              `${patient.firstName} ${patient.lastName}`,
              appointment.date,
              appointment.startTime,
              doctor?.name || 'your doctor',
              clinic?.name || 'our clinic'
            );

            appointment.reminders.push({
              type: 'whatsapp',
              status: 'sent',
              sentAt: new Date(),
            });
            await appointment.save();
          } catch (error) {
            console.error(`Failed to send reminder for appointment ${appointment._id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending appointment reminders:', error);
    }
  }

  private async checkOverdueTasks(): Promise<void> {
    const now = new Date();

    try {
      const overduePlans = await CarePlan.find({
        status: 'active',
        'tasks.status': 'pending',
        'tasks.dueDate': { $lt: now },
      })
        .populate('patientId', 'firstName lastName phone')
        .populate('clinicId', 'name');

      for (const plan of overduePlans) {
        const overdueTasks = plan.tasks.filter(
          (t) => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now
        );

        if (overdueTasks.length > 0) {
          const patient = plan.patientId as any;
          const clinic = plan.clinicId as any;

          // Emit notification to clinic dashboard
          this.io.to(`clinic:${plan.clinicId}`).emit('overdue-task', {
            planId: plan._id,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
            taskCount: overdueTasks.length,
          });

          // Send WhatsApp reminder if configured
          if (patient?.phone && whatsAppService.isConfigured()) {
            await whatsAppService.sendFollowUpReminder(
              patient.phone,
              patient.firstName,
              now,
              clinic?.name || 'our clinic'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  }

  private async cleanupOldReminders(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      await Appointment.updateMany(
        {
          'reminders.sentAt': { $lt: thirtyDaysAgo },
        },
        {
          $pull: {
            reminders: { sentAt: { $lt: thirtyDaysAgo } },
          },
        }
      );
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      console.log('Connected to MongoDB');

      // Create indexes
      await this.createIndexes();

      // Start server
      this.startServer();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      await Appointment.createIndexes();
      await Patient.createIndexes();
      console.log('Database indexes created');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  private startServer(): void {
    this.httpServer.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏥 HOJAI CLINIC AI - Healthcare Operating System     ║
║                                                          ║
║   Server running on port ${config.port}                       ║
║   Environment: ${config.nodeEnv}                             ║
║                                                          ║
║   API:       http://localhost:${config.port}${config.apiPrefix}        ║
║   Health:    http://localhost:${config.port}/health           ║
║   Docs:      http://localhost:${config.port}/api-docs          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  }
}

// Start the application
new Application();

export default Application;
