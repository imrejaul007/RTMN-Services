/**
 * RAZO KEYBOARD - ACTION CARDS
 *
 * "Do It For Me" - One-tap agent execution
 *
 * Birthday wishes, email drafts, follow-ups, etc.
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const PORT = parseInt(process.env.PORT || '4652', 10);

// Service URLs
const SERVICES = {
  genie: process.env.GENIE_URL || 'http://localhost:4760',
  relationship: process.env.RELATIONSHIP_URL || 'http://localhost:4702',
  whatsapp: process.env.WHATSAPP_URL || 'http://localhost:4704',
  email: process.env.EMAIL_URL || 'http://localhost:4002',
  calendar: process.env.CALENDAR_URL || 'http://localhost:4760',
};

// ============================================
// ACTION TYPES
// ============================================

interface ActionCard {
  id: string;
  type: 'birthday' | 'follow_up' | 'email' | 'message' | 'call' | 'meeting' | 'reminder' | 'payment' | 'order';
  title: string;
  subtitle?: string;
  recipient?: string;
  recipientId?: string;
  actions: Action[];
  preview?: string;
  confidence: number;
}

interface Action {
  label: string;
  type: 'generate' | 'execute' | 'open';
  value: string;
  icon?: string;
}

// ============================================
// ACTION ENGINES
// ============================================

class BirthdayEngine {
  async generateMessage(contactId: string, userId: string): Promise<{ message: string; tone: string }> {
    try {
      // Get contact info from relationship service
      const contact = await axios.get(`${SERVICES.relationship}/api/contact/${contactId}`, {
        timeout: 3000,
      });

      // Get communication style from Genie
      const style = await axios.get(`${SERVICES.genie}/api/twin/${userId}/style`, {
        timeout: 3000,
      });

      // Generate personalized birthday message
      const name = contact.data.name || 'Friend';
      const relationship = contact.data.relationship || 'friend';

      // Generate based on relationship and style
      const messages = this.generateMessages(name, relationship, style.data?.speakingStyle || 'friendly');

      return {
        message: messages[0],
        tone: style.data?.speakingStyle || 'friendly',
      };
    } catch {
      // Fallback to simple message
      return {
        message: `Happy birthday! 🎉 Wishing you an amazing day!`,
        tone: 'friendly',
      };
    }
  }

  private generateMessages(name: string, relationship: string, style: string): string[] {
    const templates = {
      formal: [
        `Dear ${name},\n\nWishing you a very happy birthday. May this year bring you joy and success.\n\nBest regards`,
        `Dear ${name},\n\nHappy birthday! I hope this special day brings you happiness.\n\nWarm regards`,
      ],
      friendly: [
        `Hey ${name}! 🎉 Happy birthday! Hope you have an amazing day! 🎈`,
        `Happy birthday ${name}! 🥳 Wishing you all the best on your special day! 🎂`,
      ],
      casual: [
        `Hey ${name}! 🎂 Happy birthday bro! Let's celebrate! 🎉`,
        `Yo ${name}! 🎈 Another year, another chance to rock! Happy birthday! 🎁`,
      ],
      professional: [
        `Dear ${name},\n\nI would like to extend my warmest birthday wishes to you.\n\nWishing you continued success.\n\nRegards`,
      ],
    };

    return templates[style as keyof typeof templates] || templates.friendly;
  }
}

class EmailEngine {
  async draftEmail(params: {
    to: string;
    subject?: string;
    intent?: string;
    context?: string;
    userId: string;
  }): Promise<{ subject: string; body: string; tone: string }> {
    try {
      // Get user's email style from Genie
      const style = await axios.get(`${SERVICES.genie}/api/twin/${params.userId}/style`, {
        timeout: 3000,
      });

      // Generate email based on intent
      const email = this.generateEmail(params, style.data?.speakingStyle || 'professional');

      return email;
    } catch {
      return this.generateEmail(params, 'professional');
    }
  }

  private generateEmail(params: any, style: string): { subject: string; body: string; tone: string } {
    const intent = params.intent || 'general';
    const context = params.context || '';

    const emails: Record<string, { subject: string; body: string }> = {
      follow_up: {
        subject: 'Following up - ' + (params.subject || 'Quick check-in'),
        body: `Hi,\n\nJust following up regarding our recent conversation.\n\n${context}\n\nLooking forward to hearing from you.\n\nRegards`,
      },
      meeting: {
        subject: 'Meeting Request - ' + (params.subject || 'Discussion'),
        body: `Hi,\n\nI would like to schedule a meeting to discuss ${context || 'matters of mutual interest'}.\n\nPlease let me know your availability.\n\nBest regards`,
      },
      introduction: {
        subject: 'Introduction - ' + (params.subject || 'Nice to connect'),
        body: `Hi,\n\nI hope this email finds you well. I wanted to reach out to introduce myself.\n\n${context}\n\nLooking forward to connecting with you.\n\nBest regards`,
      },
      thank_you: {
        subject: 'Thank You',
        body: `Hi,\n\nI wanted to take a moment to thank you for ${context || 'your time and consideration'}.\n\nI really appreciate your help.\n\nBest regards`,
      },
      general: {
        subject: params.subject || '',
        body: `Hi,\n\n${context}\n\nRegards`,
      },
    };

    return {
      ...emails[intent] || emails.general,
      tone: style,
    };
  }
}

class MessageEngine {
  async generateWhatsApp(params: {
    to: string;
    contactId: string;
    type: 'birthday' | 'follow_up' | 'quick' | 'custom';
    context?: string;
    userId: string;
  }): Promise<{ message: string; preview: string }> {
    try {
      const contact = await axios.get(`${SERVICES.relationship}/api/contact/${params.contactId}`, {
        timeout: 3000,
      });

      const name = contact.data.name || 'there';

      const messages = this.generateMessages(params.type, name, params.context);

      return {
        message: messages.message,
        preview: messages.preview,
      };
    } catch {
      return {
        message: `Hey! How are you?`,
        preview: `Hey! How are you?`,
      };
    }
  }

  private generateMessages(type: string, name: string, context?: string): { message: string; preview: string } {
    const templates: Record<string, { message: string; preview: string }> = {
      birthday: {
        message: `Hey ${name}! 🎉 Happy birthday! Hope you have an amazing day! 🎈`,
        preview: `🎂 Happy birthday ${name}!`,
      },
      follow_up: {
        message: `Hey ${name},\n\nJust checking in. Any updates on ${context || 'our discussion'}?\n\nThanks!`,
        preview: `📧 Follow up with ${name}`,
      },
      quick: {
        message: `Hey ${name},\n\n${context || 'Quick question - can we connect?'}\n\nThanks!`,
        preview: `💬 Quick message to ${name}`,
      },
      custom: {
        message: `Hey ${name},\n\n${context}\n\nThanks!`,
        preview: `Custom message to ${name}`,
      },
    };

    return templates[type] || templates.quick;
  }
}

class CallEngine {
  async prepareCall(params: {
    contactId: string;
    reason?: string;
    userId: string;
  }): Promise<{ script: string; talkingPoints: string[] }> {
    try {
      const contact = await axios.get(`${SERVICES.relationship}/api/contact/${params.contactId}`, {
        timeout: 3000,
      });

      const name = contact.data.name || 'there';
      const lastConversation = contact.data.lastConversation || 'your recent interaction';

      return {
        script: `Hi ${name},\n\nHope you're doing well. I wanted to follow up regarding ${params.reason || lastConversation}.\n\n[Your points here]\n\nIs there anything I can help with?`,
        talkingPoints: [
          `Key topic 1: ${params.reason || 'Discussion points'}`,
          'Key topic 2: Next steps',
          'Key topic 3: Action items',
        ],
      };
    } catch {
      return {
        script: `Hi,\n\nHope you're doing well.\n\n[Your talking points here]`,
        talkingPoints: ['Main topic', 'Follow-up points', 'Next steps'],
      };
    }
  }
}

// ============================================
// API ENDPOINTS
// ============================================

const birthdayEngine = new BirthdayEngine();
const emailEngine = new EmailEngine();
const messageEngine = new MessageEngine();
const callEngine = new CallEngine();

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-action-cards',
    version: '1.0.0',
    actions: ['birthday', 'email', 'message', 'call', 'meeting', 'reminder'],
  });
});

// ============================================
// BIRTHDAY ACTIONS
// ============================================

// Generate birthday message
app.post('/api/birthday/message', async (req, res) => {
  try {
    const { contactId, userId } = req.body;

    const result = await birthdayEngine.generateMessage(contactId, userId);

    res.json({
      success: true,
      message: result.message,
      tone: result.tone,
      actions: [
        { label: 'Send via WhatsApp', type: 'open', value: 'whatsapp', icon: '💬' },
        { label: 'Edit & Send', type: 'edit', value: result.message, icon: '✏️' },
        { label: 'Call Instead', type: 'open', value: 'call', icon: '📞' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send birthday message
app.post('/api/birthday/send', async (req, res) => {
  try {
    const { contactId, message, channel } = req.body;

    if (channel === 'whatsapp') {
      // Send via WhatsApp
      await axios.post(`${SERVICES.whatsapp}/api/send`, {
        to: contactId,
        message,
      });
    }

    res.json({ success: true, sent: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EMAIL ACTIONS
// ============================================

// Draft email
app.post('/api/email/draft', async (req, res) => {
  try {
    const { to, subject, intent, context, userId } = req.body;

    const result = await emailEngine.draftEmail({
      to,
      subject,
      intent,
      context,
      userId,
    });

    res.json({
      success: true,
      subject: result.subject,
      body: result.body,
      tone: result.tone,
      actions: [
        { label: 'Send Email', type: 'open', value: 'email', icon: '📧' },
        { label: 'Edit', type: 'edit', value: result.body, icon: '✏️' },
        { label: 'Ask Genie to Improve', type: 'genie', value: 'improve_email', icon: '🤖' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MESSAGE ACTIONS
// ============================================

// Generate WhatsApp message
app.post('/api/message/whatsapp', async (req, res) => {
  try {
    const { contactId, type, context, userId } = req.body;

    const result = await messageEngine.generateWhatsApp({
      contactId,
      type,
      context,
      userId,
    });

    res.json({
      success: true,
      message: result.message,
      preview: result.preview,
      actions: [
        { label: 'Send via WhatsApp', type: 'open', value: 'whatsapp', icon: '💬' },
        { label: 'Copy', type: 'copy', value: result.message, icon: '📋' },
        { label: 'Call Instead', type: 'open', value: 'call', icon: '📞' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CALL ACTIONS
// ============================================

// Prepare call script
app.post('/api/call/prepare', async (req, res) => {
  try {
    const { contactId, reason, userId } = req.body;

    const result = await callEngine.prepareCall({
      contactId,
      reason,
      userId,
    });

    res.json({
      success: true,
      script: result.script,
      talkingPoints: result.talkingPoints,
      actions: [
        { label: 'Call Now', type: 'open', value: 'call', icon: '📞' },
        { label: 'Send Message Instead', type: 'message', value: 'message', icon: '💬' },
        { label: 'Schedule Call', type: 'open', value: 'calendar', icon: '📅' },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DO IT FOR ME
// ============================================

// One-tap execution
app.post('/api/execute', async (req, res) => {
  try {
    const { action, contactId, userId, data } = req.body;

    let result: any;

    switch (action) {
      case 'birthday_whatsapp':
        const birthdayMsg = await birthdayEngine.generateMessage(contactId, userId);
        result = {
          action: 'birthday_whatsapp',
          message: birthdayMsg.message,
          open: 'whatsapp',
          autoSend: false,
        };
        break;

      case 'birthday_send':
        await axios.post(`${SERVICES.whatsapp}/api/send`, {
          to: contactId,
          message: data.message,
        });
        result = { action: 'sent', success: true };
        break;

      case 'email_draft':
        const email = await emailEngine.draftEmail(data);
        result = {
          action: 'email_draft',
          subject: email.subject,
          body: email.body,
          open: 'email',
        };
        break;

      case 'follow_up_whatsapp':
        const followUp = await messageEngine.generateWhatsApp({
          contactId,
          type: 'follow_up',
          context: data?.context,
          userId,
        });
        result = {
          action: 'follow_up_whatsapp',
          message: followUp.message,
          open: 'whatsapp',
        };
        break;

      case 'call_prepare':
        const call = await callEngine.prepareCall({
          contactId,
          reason: data?.reason,
          userId,
        });
        result = {
          action: 'call_prepare',
          script: call.script,
          talkingPoints: call.talkingPoints,
          open: 'dialer',
        };
        break;

      default:
        result = { error: 'Unknown action' };
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTION CARDS FOR KEYBOARD
// ============================================

// Get action cards for contact
app.get('/api/cards/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;

    // Get contact info
    let contact = { name: 'Unknown', phone: '', email: '' };
    try {
      const c = await axios.get(`${SERVICES.relationship}/api/contact/${contactId}`, { timeout: 2000 });
      contact = c.data;
    } catch { /* use defaults */ }

    const cards: ActionCard[] = [
      {
        id: 'card-birthday',
        type: 'birthday',
        title: '🎂 Birthday Message',
        subtitle: 'Generate personalized birthday wish',
        recipient: contact.name,
        recipientId: contactId,
        actions: [
          { label: 'Generate & Send', type: 'generate', value: 'birthday_whatsapp', icon: '✨' },
          { label: 'Preview', type: 'generate', value: 'birthday_preview', icon: '👁️' },
        ],
      },
      {
        id: 'card-followup',
        type: 'follow_up',
        title: '📧 Follow Up',
        subtitle: 'Check in with ' + contact.name,
        recipient: contact.name,
        recipientId: contactId,
        actions: [
          { label: 'Send WhatsApp', type: 'generate', value: 'follow_up_whatsapp', icon: '💬' },
          { label: 'Draft Email', type: 'generate', value: 'email_draft', icon: '📧' },
          { label: 'Call', type: 'generate', value: 'call_prepare', icon: '📞' },
        ],
      },
      {
        id: 'card-quick-message',
        type: 'message',
        title: '💬 Quick Message',
        subtitle: 'Send a quick note to ' + contact.name,
        recipient: contact.name,
        recipientId: contactId,
        actions: [
          { label: 'Generate Message', type: 'generate', value: 'quick_message', icon: '✨' },
          { label: 'Voice Note', type: 'open', value: 'voice_note', icon: '🎤' },
        ],
      },
    ];

    res.json({ cards });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎯 RAZO Action Cards (4652)                       ║
║                                                       ║
║   "Do It For Me" Actions:                            ║
║   ├── Birthday messages                               ║
║   ├── Email drafts                                    ║
║   ├── WhatsApp follow-ups                             ║
║   ├── Call scripts                                    ║
║   └── One-tap execution                              ║
║                                                       ║
║   Port: ${PORT}                                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;