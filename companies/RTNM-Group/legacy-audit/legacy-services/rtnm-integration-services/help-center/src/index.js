/**
 * RTMN Help Center
 * Self-service support portal for RTMN products
 *
 * @version 1.0.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid').v4;

const app = express();

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/help-center.log' })
    ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data stores (use database in production)
const articles = new Map();
const tickets = new Map();
const categories = new Map();
const faqs = new Map();

// Initialize sample data
initializeSampleData();

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'RTMN Help Center',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const allCategories = Array.from(categories.values());
    res.json({
        success: true,
        data: allCategories
    });
});

// Get articles by category
app.get('/api/articles/category/:categoryId', (req, res) => {
    const { categoryId } = req.params;
    const categoryArticles = Array.from(articles.values())
        .filter(a => a.categoryId === categoryId)
        .map(a => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            category: categories.get(a.categoryId)?.name,
            updatedAt: a.updatedAt
        }));

    res.json({
        success: true,
        data: categoryArticles
    });
});

// Get single article
app.get('/api/articles/:slug', (req, res) => {
    const { slug } = req.params;
    const article = Array.from(articles.values())
        .find(a => a.slug === slug);

    if (!article) {
        return res.status(404).json({
            success: false,
            error: 'Article not found'
        });
    }

    res.json({
        success: true,
        data: article
    });
});

// Search articles
app.get('/api/articles/search/:query', (req, res) => {
    const { query } = req.params;
    const searchResults = Array.from(articles.values())
        .filter(a =>
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.content.toLowerCase().includes(query.toLowerCase())
        )
        .map(a => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            category: categories.get(a.categoryId)?.name
        }));

    res.json({
        success: true,
        data: searchResults,
        count: searchResults.length
    });
});

// Get FAQs
app.get('/api/faqs', (req, res) => {
    const { category } = req.query;
    let allFAQs = Array.from(faqs.values());

    if (category) {
        allFAQs = allFAQs.filter(f => f.category === category);
    }

    res.json({
        success: true,
        data: allFAQs
    });
});

// Submit support ticket
app.post('/api/tickets', (req, res) => {
    const { category, subject, description, email, priority } = req.body;

    if (!subject || !description || !email) {
        return res.status(400).json({
            success: false,
            error: 'Subject, description, and email are required'
        });
    }

    const ticketId = uuidv4();
    const ticket = {
        id: ticketId,
        category: category || 'general',
        subject,
        description,
        email,
        priority: priority || 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };

    tickets.set(ticketId, ticket);

    logger.info({
        type: 'ticket_created',
        ticketId,
        category,
        priority
    });

    res.status(201).json({
        success: true,
        data: {
            ticketId,
            message: 'Your ticket has been submitted. We will respond within 24 hours.',
            expectedResponse: '24 hours'
        }
    });
});

// Get ticket status
app.get('/api/tickets/:ticketId', (req, res) => {
    const { ticketId } = req.params;
    const ticket = tickets.get(ticketId);

    if (!ticket) {
        return res.status(404).json({
            success: false,
            error: 'Ticket not found'
        });
    }

    res.json({
        success: true,
        data: ticket
    });
});

// Add message to ticket
app.post('/api/tickets/:ticketId/messages', (req, res) => {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }

    const ticket = tickets.get(ticketId);

    if (!ticket) {
        return res.status(404).json({
            success: false,
            error: 'Ticket not found'
        });
    }

    const newMessage = {
        id: uuidv4(),
        message,
        sender: 'customer',
        createdAt: new Date().toISOString()
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = new Date().toISOString();
    tickets.set(ticketId, ticket);

    res.json({
        success: true,
        data: ticket
    });
});

// System status
app.get('/api/status', (req, res) => {
    const services = [
        { name: 'Unified API Gateway', status: 'online', latency: 45 },
        { name: 'HOJAI AI', status: 'online', latency: 120 },
        { name: 'RABTUL Payments', status: 'online', latency: 80 },
        { name: 'CorpPerks HRMS', status: 'online', latency: 60 },
        { name: 'AdBazaar Marketing', status: 'online', latency: 95 },
        { name: 'SafeQR', status: 'online', latency: 40 },
        { name: 'Nexha Identity', status: 'online', latency: 55 }
    ];

    const onlineCount = services.filter(s => s.status === 'online').length;

    res.json({
        success: true,
        data: {
            overall: onlineCount === services.length ? 'all_operational' : 'degraded',
            services,
            lastUpdated: new Date().toISOString()
        }
    });
});

// Quick links
app.get('/api/quick-links', (req, res) => {
    const quickLinks = [
        {
            title: 'Getting Started Guide',
            description: 'Set up your account and first product',
            url: '/articles/getting-started',
            icon: '🚀'
        },
        {
            title: 'API Documentation',
            description: 'Technical integration guides',
            url: '/articles/api-documentation',
            icon: '📖'
        },
        {
            title: 'Billing FAQ',
            description: 'Common billing questions',
            url: '/articles/billing-faq',
            icon: '💰'
        },
        {
            title: 'Contact Support',
            description: 'Submit a ticket',
            url: '/tickets/new',
            icon: '🎫'
        }
    ];

    res.json({
        success: true,
        data: quickLinks
    });
});

// Initialize sample data
function initializeSampleData() {
    // Categories
    const categoryData = [
        { id: 'getting-started', name: 'Getting Started', icon: '🚀', order: 1 },
        { id: 'account', name: 'Account & Billing', icon: '💳', order: 2 },
        { id: 'products', name: 'Products', icon: '📦', order: 3 },
        { id: 'integrations', name: 'Integrations', icon: '🔗', order: 4 },
        { id: 'api', name: 'API & Developers', icon: '⚙️', order: 5 },
        { id: 'security', name: 'Security', icon: '🔒', order: 6 },
        { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧', order: 7 }
    ];

    categoryData.forEach(c => categories.set(c.id, c));

    // Articles
    const articleData = [
        {
            id: '1',
            categoryId: 'getting-started',
            title: 'Welcome to RTMN',
            slug: 'welcome-to-rtmn',
            excerpt: 'Learn how to get started with RTMN ecosystem',
            content: `# Welcome to RTMN\n\nRTMN is a unified ecosystem...`,
            author: 'RTMN Team',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '2',
            categoryId: 'account',
            title: 'Managing Your Subscription',
            slug: 'managing-subscription',
            excerpt: 'How to update, upgrade, or cancel your subscription',
            content: `# Managing Your Subscription\n\nThis guide covers...`,
            author: 'RTMN Team',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '3',
            categoryId: 'products',
            title: 'HOJAI AI Platform Overview',
            slug: 'hojai-overview',
            excerpt: 'Learn about our AI platform with 600+ agents',
            content: `# HOJAI AI Platform\n\nHOJAI is...`,
            author: 'RTMN Team',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '4',
            categoryId: 'integrations',
            title: 'Connecting CorpPerks to RABTUL',
            slug: 'corpperks-rabtul-integration',
            excerpt: 'Auto-create wallets for new employees',
            content: `# CorpPerks → RABTUL Integration\n\nFollow these steps...`,
            author: 'RTMN Team',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '5',
            categoryId: 'api',
            title: 'API Authentication',
            slug: 'api-authentication',
            excerpt: 'How to authenticate API requests',
            content: `# API Authentication\n\nRTMN uses JWT tokens...`,
            author: 'RTMN Team',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    articleData.forEach(a => articles.set(a.id, a));

    // FAQs
    const faqData = [
        {
            id: '1',
            category: 'billing',
            question: 'How does billing work?',
            answer: 'RTMN bills monthly based on your selected plan and usage.'
        },
        {
            id: '2',
            category: 'billing',
            question: 'Can I change plans mid-cycle?',
            answer: 'Yes, changes take effect immediately and are prorated.'
        },
        {
            id: '3',
            category: 'technical',
            question: 'What is the SLA uptime?',
            answer: 'Enterprise: 99.99%, Growth: 99.9%, Starter: 99.5%'
        },
        {
            id: '4',
            category: 'technical',
            question: 'How do I reset my API key?',
            answer: 'Go to Settings > API Keys and click Regenerate.'
        }
    ];

    faqData.forEach(f => faqs.set(f.id, f));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    logger.info(`🆘 RTMN Help Center running on port ${PORT}`);
    logger.info(`📖 API: http://localhost:${PORT}/api`);
});

module.exports = app;
