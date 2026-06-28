/**
 * Email Inbound Handler
 * ======================
 * Receives inbound emails via three methods:
 *
 * 1. HTTP Webhook  — from SendGrid, AWS SES, Mailgun, Postmark, etc.
 * 2. SMTP MX Record — receive emails directly via this service as an MX server
 *    (using a simple SMTP receiver on a dedicated port)
 * 3. IMAP/POP3 Polling — poll external mailboxes (Gmail, Outlook)
 *
 * All three methods normalize to a common EmailMessage format:
 * {
 *   messageId: string,
 *   from: { email, name },
 *   to: string[],
 *   subject: string,
 *   text: string,
 *   html: string,
 *   inReplyTo: string | null,
 *   references: string[],
 *   date: Date,
 *   attachments: Attachment[],
 *   rawHeaders: Record<string, string>
 * }
 */

const { v4: uuidv4 } = require('uuid');
const { simpleParser } = require('mailparser');

/**
 * Normalize email from any provider format to our internal EmailMessage
 */

// SendGrid Inbound Parse Webhook
function fromSendGrid(body, headers = {}) {
  return {
    messageId: body.headers?.['Message-ID'] || body['Message-ID'] || body.message_id || `sg-${uuidv4().slice(0, 8)}`,
    from: {
      email: (body.from || '').replace(/.*<(.+?)>.*/, '$1').trim() || body.from_email,
      name: body.from?.match(/^"(.+?)"/)?.[1] || body.fromName || null,
    },
    to: Array.isArray(body.to) ? body.to : [body.to || body.recipient || ''].filter(Boolean),
    subject: body.subject || '(no subject)',
    text: body.text || body.content || body.body || stripHtml(body.html || body.html_stripped || ''),
    html: body.html || null,
    inReplyTo: body['In-Reply-To'] || body.in_reply_to || null,
    references: parseReferences(body.References || body.references || ''),
    date: new Date(body.date || Date.now()),
    attachments: parseAttachments(body.attachments),
    rawHeaders: body.headers || {},
    provider: 'sendgrid',
    raw: body,
  };
}

// AWS SES format
function fromSES(body, headers = {}) {
  const mail = body.mail || {};
  const content = body.content || body.message || '';
  return {
    messageId: mail.messageId || `ses-${uuidv4().slice(0, 8)}`,
    from: {
      email: mail.source || body.from || '',
      name: null,
    },
    to: (mail.destination || mail.to || []).map(d => typeof d === 'string' ? d : d.email),
    subject: mail.subject || '(no subject)',
    text: body.text || content,
    html: body.html || null,
    inReplyTo: mail.inReplyTo || body['In-Reply-To'] || null,
    references: parseReferences(mail.references || body.References || ''),
    date: new Date(mail.timestamp || Date.now()),
    attachments: [],
    rawHeaders: headers,
    provider: 'ses',
    raw: body,
  };
}

// Mailgun format
function fromMailgun(body, headers = {}) {
  return {
    messageId: body['Message-ID'] || body['Message-Id'] || `mg-${uuidv4().slice(0, 8)}`,
    from: {
      email: body.from || '',
      name: null,
    },
    to: [body.To || body.to].filter(Boolean),
    subject: body.subject || '(no subject)',
    text: body['body-plain'] || body.text || '',
    html: body['body-html'] || null,
    inReplyTo: body['In-Reply-To'] || null,
    references: parseReferences(body.References || ''),
    date: new Date(body['Date'] || Date.now()),
    attachments: [],
    rawHeaders: headers,
    provider: 'mailgun',
    raw: body,
  };
}

// Postmark format
function fromPostmark(body) {
  return {
    messageId: body.MessageID || `pm-${uuidv4().slice(0, 8)}`,
    from: {
      email: body.From || '',
      name: body.FromName || null,
    },
    to: (body.To || []).map(t => typeof t === 'string' ? t : t.Email || t),
    subject: body.Subject || '(no subject)',
    text: body.TextBody || '',
    html: body.HtmlBody || null,
    inReplyTo: body.InReplyTo || null,
    references: parseReferences(body.References || ''),
    date: new Date(body.Date || Date.now()),
    attachments: body.Attachments || [],
    rawHeaders: {},
    provider: 'postmark',
    raw: body,
  };
}

// Generic / raw MIME format (from SMTP receiver)
async function fromRawMime(raw, headers = {}) {
  try {
    const parsed = await simpleParser(raw);
    return {
      messageId: parsed.messageId || `mime-${uuidv4().slice(0, 8)}`,
      from: {
        email: parsed.from?.text || parsed.from?.value?.[0]?.address || '',
        name: parsed.from?.value?.[0]?.name || null,
      },
      to: parsed.to?.text ? [parsed.to.text] : (parsed.to?.value || []).map(a => a.address || a.text || ''),
      subject: parsed.subject || '(no subject)',
      text: parsed.text || '',
      html: parsed.html || null,
      inReplyTo: parsed.headers.get('in-reply-to') || null,
      references: parseReferences(parsed.headers.get('references') || ''),
      date: parsed.date || new Date(),
      attachments: (parsed.attachments || []).map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        content: a.content.toString('base64'),
      })),
      rawHeaders: Object.fromEntries(
        [...parsed.headers.entries()].map(([k, v]) => [k.toLowerCase(), typeof v === 'object' ? v.text : String(v)])
      ),
      provider: 'smtp',
      raw: raw,
    };
  } catch (e) {
    return null;
  }
}

// Detect provider and normalize
async function normalizeEmail(body, headers = {}, rawMime = null) {
  // Try to detect provider
  if (body && body._category) return fromSendGrid(body, headers);
  if (body && body.mail && body.mail.messageId) return fromSES(body, headers);
  if (body && body.signature) return fromMailgun(body, headers);
  if (body && body.MessageID) return fromPostmark(body);
  if (body && body.entry) return null; // This is WhatsApp, not email
  if (rawMime) return await fromRawMime(rawMime, headers);

  // Generic format
  const from = body.from || headers.from || '';
  return {
    messageId: body['Message-ID'] || body.message_id || `gen-${uuidv4().slice(0, 8)}`,
    from: {
      email: from.replace(/.*<(.+?)>.*/, '$1').trim() || from,
      name: from.match(/^"(.+?)"/)?.[1] || null,
    },
    to: [body.to || headers.to || ''].filter(Boolean),
    subject: body.subject || '(no subject)',
    text: body.text || body.body || body.content || '',
    html: body.html || null,
    inReplyTo: body['In-Reply-To'] || body.in_reply_to || null,
    references: parseReferences(body.References || body.references || headers.references || ''),
    date: new Date(body.date || Date.now()),
    attachments: [],
    rawHeaders: headers,
    provider: 'generic',
    raw: body,
  };
}

// ─── Helpers ──────────────────────────────────────────────────
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReferences(refs) {
  if (!refs) return [];
  if (typeof refs === 'string') {
    return refs.trim().split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(refs)) return refs.filter(Boolean);
  return [];
}

function parseAttachments(attachments) {
  if (!attachments) return [];
  if (typeof attachments === 'string') {
    try { attachments = JSON.parse(attachments); } catch { return []; }
  }
  if (!Array.isArray(attachments)) return [];
  return attachments.map(a => ({
    filename: a.filename || a.name || 'attachment',
    contentType: a.type || 'application/octet-stream',
    size: a.size || 0,
    content: a.content || a.data || '',
  }));
}

// ─── SMTP Receiver ────────────────────────────────────────────
// Simple SMTP server using Node.js net module
// Run this alongside the main Express app on port 25 or 1025 (dev)
function createSmtpReceiver(onEmail, port = 1025) {
  const net = require('net');

  const server = net.createServer((socket) => {
    let state = { phase: 'greeting', data: '', from: null, to: [], headers: {} };

    const send = (code, msg) => {
      socket.write(`${code} ${msg}\r\n`);
    };

    const reset = () => {
      state = { phase: 'greeting', data: '', from: null, to: [], headers: {} };
    };

    socket.on('data', async (chunk) => {
      const lines = chunk.toString().split('\r\n');

      for (const line of lines) {
        if (line === '') {
          // End of command or end of data
          if (state.phase === 'data') {
            // End of email data — process it
            state.data += '\r\n';
            try {
              const email = await fromRawMime(state.data, state.headers);
              if (email) {
                onEmail(email).catch(e => console.error('[smtp] email handler error:', e));
              }
            } catch (e) {
              console.error('[smtp] parse error:', e.message);
            }
            state.phase = 'command';
            state.data = '';
          }
          continue;
        }

        if (state.phase === 'greeting') {
          if (line.startsWith('EHLO') || line.startsWith('HELO')) {
            send(250, 'OK');
            state.phase = 'command';
          } else if (line.startsWith('QUIT')) {
            send(221, 'Bye');
            socket.end();
          }
        } else if (state.phase === 'command') {
          const cmd = line.toUpperCase();
          const rest = line.substring(line.indexOf(' ') + 1);

          if (cmd === 'QUIT') {
            send(221, 'Bye');
            socket.end();
          } else if (cmd === 'NOOP') {
            send(250, 'OK');
          } else if (cmd === 'RSET') {
            reset();
            send(250, 'OK');
          } else if (cmd === 'MAIL FROM') {
            state.from = rest.replace(/FROM:<(.+?)>/i, '$1').trim();
            send(250, 'OK');
          } else if (cmd === 'RCPT TO') {
            state.to.push(rest.replace(/TO:<(.+?)>/i, '$1').trim());
            send(250, 'OK');
          } else if (cmd === 'DATA') {
            state.phase = 'data';
            state.data = '';
            send(354, 'End data with <CR><LF>.<CR><LF>');
          } else if (cmd.startsWith('X-') || cmd.startsWith('AUTH')) {
            send(250, 'OK');
          }
        } else if (state.phase === 'data') {
          // Collect headers and body
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
            const key = line.substring(0, colonIdx).toLowerCase();
            const value = line.substring(colonIdx + 1).trim();
            state.headers[key] = value;
          }
          state.data += line + '\r\n';
        }
      }
    });

    socket.on('error', (e) => {
      if (e.code !== 'ECONNRESET') {
        console.error('[smtp] socket error:', e.message);
      }
    });

    send(220, process.env.SMTP_BANNER || 'Unified Support Bridge SMTP');
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`[smtp] port ${port} in use — SMTP receiver disabled. Set SMTP_PORT env to change.`);
    } else {
      console.error('[smtp] server error:', e.message);
    }
  });

  return server;
}

// ─── IMAP Polling ─────────────────────────────────────────────
// Poll external mailboxes (Gmail, Outlook, etc.) for new emails
function createImapPoller(onEmail, intervalMs = 60000) {
  let intervalId = null;

  async function poll() {
    const imapConfig = {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      tls: process.env.IMAP_TLS !== 'false',
      tlsOptions: { rejectUnauthorized: false },
    };

    if (!imapConfig.user || !imapConfig.password) {
      return; // IMAP not configured
    }

    try {
      // Dynamic import to avoid requiring imap when not used
      const { ImapFlow } = require('imapflow');
      const client = new ImapFlow(imapConfig);

      try {
        await client.connect();

        // Lock the INBOX
        const lock = await client.getMailboxLock();
        try {
          // Fetch unseen messages since last check
          const lastUid = parseInt(process.env.IMAP_LAST_UID || '0', 10);
          const query = lastUid > 0 ? { uid: { gt: lastUid } } : { unseen: true };
          const messages = await client.fetch(query, { envelope: true, source: true, uid: true });

          for (const msg of messages) {
            const email = await fromRawMime(msg.source.toString(), {});
            if (email) {
              email.imapUid = msg.uid;
              await onEmail(email);
              if (msg.uid > lastUid) {
                process.env.IMAP_LAST_UID = String(msg.uid);
              }
            }
          }
        } finally {
          lock.release();
        }
      } finally {
        await client.logout();
      }
    } catch (e) {
      if (!e.message?.includes('AUTHENTICATIONFAILED') && !e.message?.includes('ECONNREFUSED')) {
        console.error('[imap] poll error:', e.message);
      }
    }
  }

  function start() {
    poll(); // immediate
    intervalId = setInterval(poll, intervalMs);
    console.log(`[imap] polling started every ${intervalMs}ms`);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('[imap] polling stopped');
    }
  }

  return { start, stop, poll };
}

module.exports = {
  normalizeEmail,
  fromSendGrid,
  fromSES,
  fromMailgun,
  fromPostmark,
  fromRawMime,
  createSmtpReceiver,
  createImapPoller,
};
