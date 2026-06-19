/**
 * Capture Routes
 *
 * Capture memories from different sources:
 * - Voice notes
 * - Images/screenshots
 * - Links/bookmarks
 * - Text notes
 * - Emails
 * - WhatsApp messages
 * - Files/documents
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function(memories, classifier) {
  const router = express.Router();

  /**
   * POST /api/capture/text
   * Capture text note
   */
  router.post('/text', (req, res) => {
    const { userId, text, category, tags, metadata = {} } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }

    // Classify automatically
    const classification = classifier.classify(text, { type: 'text', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'text',
      title: classification.title,
      content: text,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'text-input',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/voice
   * Capture voice note
   */
  router.post('/voice', (req, res) => {
    const { userId, text, audioUrl, duration, transcription, category, tags, metadata = {} } = req.body;

    if (!text && !audioUrl) {
      return res.status(400).json({ success: false, error: 'Text or audioUrl required' });
    }

    // Classify automatically
    const classification = classifier.classify(text || '', { type: 'voice', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'voice',
      title: classification.title,
      content: text || 'Voice note',
      audioUrl,
      duration,
      transcription: transcription || text,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'voice-input',
      metadata: {
        ...metadata,
        hasAudio: !!audioUrl,
        durationSeconds: duration
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/image
   * Capture image or screenshot
   */
  router.post('/image', (req, res) => {
    const { userId, imageUrl, base64, caption, ocrText, category, tags, metadata = {} } = req.body;

    if (!imageUrl && !base64) {
      return res.status(400).json({ success: false, error: 'Image URL or base64 required' });
    }

    // Classify from OCR text or caption
    const textToClassify = ocrText || caption || '';
    const classification = classifier.classify(textToClassify, { type: 'image', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'image',
      title: caption || 'Image capture',
      content: caption || '',
      imageUrl,
      base64: base64 ? base64.substring(0, 100) + '...' : null, // Store truncated for safety
      ocrText,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'image-capture',
      metadata: {
        ...metadata,
        hasOcr: !!ocrText
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/link
   * Capture bookmark/URL
   */
  router.post('/link', (req, res) => {
    const { userId, url, title, description, favicon, category, tags, metadata = {} } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL required' });
    }

    // Classify from title/description
    const textToClassify = `${title || ''} ${description || ''}`;
    const classification = classifier.classify(textToClassify, { type: 'link', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'link',
      title: title || classification.title,
      content: description || '',
      url,
      favicon,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'link-capture',
      metadata: {
        ...metadata,
        domain: extractDomain(url)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/email
   * Capture forwarded email
   */
  router.post('/email', (req, res) => {
    const { userId, from, to, subject, body, attachments, category, tags, metadata = {} } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ success: false, error: 'Email body or subject required' });
    }

    // Classify from email content
    const textToClassify = `${subject || ''} ${body || ''}`;
    const classification = classifier.classify(textToClassify, { type: 'email', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'email',
      title: subject || classification.title,
      content: body || '',
      emailData: {
        from,
        to,
        subject,
        attachments: attachments || []
      },
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'email-forward',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/whatsapp
   * Capture WhatsApp message (from webhook)
   */
  router.post('/whatsapp', (req, res) => {
    const { userId, from, message, mediaUrl, timestamp, category, tags, metadata = {} } = req.body;

    if (!message && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Message or mediaUrl required' });
    }

    // Classify message
    const classification = classifier.classify(message || '', { type: 'whatsapp', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || from || 'default',
      type: 'whatsapp',
      title: message ? message.substring(0, 50) + (message.length > 50 ? '...' : '') : 'WhatsApp media',
      content: message || '',
      mediaUrl,
      sourceContact: from,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'whatsapp-capture',
      metadata: {
        ...metadata,
        platform: 'whatsapp'
      },
      createdAt: timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/document
   * Capture document/file
   */
  router.post('/document', (req, res) => {
    const { userId, fileUrl, fileName, fileType, fileSize, text, category, tags, metadata = {} } = req.body;

    if (!fileUrl && !text) {
      return res.status(400).json({ success: false, error: 'File URL or text required' });
    }

    // Classify from text content
    const classification = classifier.classify(text || fileName || '', { type: 'document', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'document',
      title: fileName || classification.title,
      content: text || '',
      fileUrl,
      fileType: fileType || extractFileType(fileName),
      fileSize,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'document-capture',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/meeting
   * Capture meeting notes
   */
  router.post('/meeting', (req, res) => {
    const { userId, title, notes, attendees, duration, date, category, tags, metadata = {} } = req.body;

    if (!notes && !title) {
      return res.status(400).json({ success: false, error: 'Notes or title required' });
    }

    // Classify meeting notes
    const textToClassify = `${title || ''} ${notes || ''}`;
    const classification = classifier.classify(textToClassify, { type: 'meeting', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'meeting',
      title: title || classification.title,
      content: notes || '',
      meetingData: {
        attendees: attendees || [],
        duration,
        date: date || new Date().toISOString()
      },
      category: category || 'work',
      tags: tags || classification.tags,
      classification,
      source: 'meeting-capture',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/expense
   * Capture expense/receipt
   */
  router.post('/expense', (req, res) => {
    const { userId, amount, currency, merchant, category, date, imageUrl, ocrText, tags, metadata = {} } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount required' });
    }

    // Expenses are auto-classified as finance
    const textToClassify = `${merchant || ''} ${category || ''} ${ocrText || ''}`;
    const classification = classifier.classify(textToClassify, { type: 'expense', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'expense',
      title: merchant ? `Expense at ${merchant}` : 'Expense',
      content: ocrText || '',
      expenseData: {
        amount: parseFloat(amount),
        currency: currency || 'INR',
        merchant,
        category: category || 'other',
        date: date || new Date().toISOString(),
        receiptImage: imageUrl
      },
      category: 'finance',
      tags: tags || ['expense', ...(classification.tags || [])],
      classification: {
        ...classification,
        twinType: 'financial'
      },
      source: 'expense-capture',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  /**
   * POST /api/capture/quick
   * Quick capture - "Remember this"
   */
  router.post('/quick', (req, res) => {
    const { userId, text, category, tags, metadata = {} } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }

    // Quick capture - classify everything
    const classification = classifier.classify(text, { type: 'text', metadata });

    const memory = {
      id: uuidv4(),
      userId: userId || 'default',
      type: 'text',
      title: classification.title,
      content: text,
      category: category || classification.category,
      tags: tags || classification.tags,
      classification,
      source: 'quick-capture',
      metadata: {
        ...metadata,
        quickCapture: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memories.set(memory.id, memory);

    res.status(201).json({
      success: true,
      memory,
      classification
    });
  });

  // Helper functions
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  function extractFileType(fileName) {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop().toLowerCase();
    const types = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg'
    };
    return types[ext] || 'application/octet-stream';
  }

  return router;
};
