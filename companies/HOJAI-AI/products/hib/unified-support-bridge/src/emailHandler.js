'use strict';

var crypto = require('crypto');

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

function fromSendGrid(body, headers) {
  var from = body.from || {};
  var fromEmail = from.email || '';
  var fromName = from.name || null;
  var text = body.text || '';
  if (body.html && !text) text = stripHtml(body.html);
  return {
    messageId: body.headers && body.headers['Message-ID'] || body.email_id || 'sg-' + Date.now(),
    from: { email: fromEmail.toLowerCase(), name: fromName },
    to: Array.isArray(body.to) ? body.to.map(function(t) { return t.email || t; }) : [(body.to && body.to.email) || body.to || ''],
    subject: body.subject || '(no subject)',
    text: text,
    html: body.html || null,
    inReplyTo: body.headers && body.headers['In-Reply-To'] || null,
    references: parseReferences(body.headers && body.headers['References'] || ''),
    date: new Date(body.timestamp || Date.now()),
    attachments: body.attachments || [],
    rawHeaders: body.headers || {},
    provider: 'sendgrid',
    raw: body,
  };
}

function fromSES(body, headers) {
  var mail = body.mail || {};
  var fromEmail = mail.commonHeaders && mail.commonHeaders.from && mail.commonHeaders.from[0] || '';
  fromEmail = fromEmail.replace(/.*<(.+?)>.*/, '$1').trim() || fromEmail;
  var receipt = body.receipt || {};
  var content = receipt.action && receipt.action.data || '';
  return {
    messageId: mail.messageId || 'ses-' + Date.now(),
    from: { email: fromEmail.toLowerCase(), name: null },
    to: mail.commonHeaders && mail.commonHeaders.to || [],
    subject: mail.commonHeaders && mail.commonHeaders.subject || '(no subject)',
    text: content,
    html: null,
    inReplyTo: mail.commonHeaders && mail.commonHeaders.inReplyTo || null,
    references: parseReferences(mail.commonHeaders && mail.commonHeaders.references || ''),
    date: new Date(body.receipt && body.receipt.timestamp || Date.now()),
    attachments: [],
    rawHeaders: {},
    provider: 'ses',
    raw: body,
  };
}

function fromMailgun(body, headers) {
  var fromEmail = body.sender && body.sender.email || body.from || '';
  fromEmail = fromEmail.replace(/.*<(.+?)>.*/, '$1').trim() || fromEmail;
  var text = body['body-plain'] || body['stripped-text'] || '';
  var html = body['body-html'] || '';
  return {
    messageId: body['Message-ID'] || body['Message-Id'] || 'mg-' + Date.now(),
    from: { email: fromEmail.toLowerCase(), name: body['sender-name'] || null },
    to: [body.recipient || ''],
    subject: body.subject || '(no subject)',
    text: text,
    html: html || null,
    inReplyTo: body['In-Reply-To'] || null,
    references: parseReferences(body.References || ''),
    date: new Date(body.timestamp ? parseInt(body.timestamp, 10) * 1000 : Date.now()),
    attachments: [],
    rawHeaders: {},
    provider: 'mailgun',
    raw: body,
  };
}

function fromPostmark(body) {
  var fromEmail = body.From || '';
  fromEmail = fromEmail.replace(/.*<(.+?)>.*/, '$1').trim() || fromEmail;
  return {
    messageId: body.MessageID || body.MessageId || 'pm-' + Date.now(),
    from: { email: fromEmail.toLowerCase(), name: null },
    to: [body.To || ''],
    subject: body.Subject || '(no subject)',
    text: body.TextBody || '',
    html: body.HtmlBody || null,
    inReplyTo: body.InReplyTo || null,
    references: parseReferences(body.References || ''),
    date: new Date(body.Date || Date.now()),
    attachments: [],
    rawHeaders: {},
    provider: 'postmark',
    raw: body,
  };
}

function fromRawMime(raw, headers) {
  var lines = raw.split(/\r?\n/);
  var state = { phase: 'header', from: null, to: [], subject: null, messageId: null, inReplyTo: null, contentType: null, body: '', headers: {} };
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (state.phase === 'header') {
      if (line.trim() === '') {
        state.phase = 'body';
      } else {
        var colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          var key = line.substring(0, colonIdx).trim().toLowerCase();
          var val = line.substring(colonIdx + 1).trim();
          state.headers[key] = val;
          if (key === 'from') state.from = val;
          if (key === 'to') state.to = val.split(',').map(function(s) { return s.trim(); });
          if (key === 'subject') state.subject = val;
          if (key === 'message-id') state.messageId = val.replace(/[<>]/g, '');
          if (key === 'in-reply-to') state.inReplyTo = val.replace(/[<>]/g, '');
        }
      }
    } else {
      state.body += line + '\n';
    }
  }
  var fromEmail = '';
  if (state.from) {
    fromEmail = state.from.replace(/.*<(.+?)>.*/, '$1').trim() || state.from;
  }
  var text = state.body.trim();
  return {
    messageId: state.messageId || 'mime-' + Date.now(),
    from: { email: fromEmail.toLowerCase(), name: null },
    to: state.to,
    subject: state.subject || '(no subject)',
    text: text,
    html: null,
    inReplyTo: state.inReplyTo,
    references: [],
    date: new Date(),
    attachments: [],
    rawHeaders: state.headers,
    provider: 'smtp',
    raw: raw,
  };
}

function normalizeEmail(body, headers, rawMime) {
  if (!body) return null;
  if (body._category) return fromSendGrid(body, headers);
  if (body.mail && body.mail.messageId) return fromSES(body, headers);
  if (body.signature) return fromMailgun(body, headers);
  if (body.MessageID) return fromPostmark(body);
  if (body.entry) return null;
  if (rawMime) return fromRawMime(rawMime, headers);
  // Simple JSON format: { from, subject, text }
  var fromField = body.from || '';
  var emailAddr = fromField.replace(/.*<(.+?)>.*/, '$1').trim() || fromField;
  var nameMatch = fromField.match(/^"(.+?)"/);
  return {
    messageId: body['Message-ID'] || body.message_id || 'gen-' + crypto.randomUUID().slice(0, 8),
    from: { email: emailAddr.toLowerCase(), name: nameMatch ? nameMatch[1] : null },
    to: Array.isArray(body.to) ? body.to : [body.to || ''],
    subject: body.subject || '(no subject)',
    text: body.text || body.body || body.content || '',
    html: body.html || null,
    inReplyTo: body['In-Reply-To'] || body.in_reply_to || null,
    references: parseReferences(body.References || body.references || ''),
    date: new Date(body.date || Date.now()),
    attachments: [],
    rawHeaders: headers || {},
    provider: 'generic',
    raw: body,
  };
}

function createSmtpReceiver(onEmail, port) {
  var net = require('net');
  var server = net.createServer();
  var clients = [];
  server.on('connection', function(socket) {
    clients.push(socket);
    socket.setEncoding('utf8');
    var state = { step: 'greeting', from: null, to: [], data: '', headers: {} };
    socket.write('220 USB SMTP Server Ready\r\n');
    socket.on('data', function(chunk) {
      var lines = chunk.split(/\r?\n/);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (state.step === 'greeting') {
          socket.write('220 USB SMTP Server Ready\r\n');
          state.step = 'command';
        } else if (state.step === 'command') {
          if (line.toUpperCase().startsWith('QUIT')) {
            socket.write('221 Bye\r\n');
            socket.end();
          } else if (line.toUpperCase().startsWith('HELO') || line.toUpperCase().startsWith('EHLO')) {
            socket.write('250 USB OK\r\n');
          } else if (line.toUpperCase().startsWith('MAIL FROM:')) {
            state.from = line.substring(10).trim().replace(/[<>]/g, '');
            socket.write('250 OK\r\n');
          } else if (line.toUpperCase().startsWith('RCPT TO:')) {
            state.to.push(line.substring(9).trim().replace(/[<>]/g, ''));
            socket.write('250 OK\r\n');
          } else if (line.toUpperCase() === 'DATA') {
            state.step = 'data';
            socket.write('354 Start mail input\r\n');
          } else {
            socket.write('250 OK\r\n');
          }
        } else if (state.step === 'data') {
          if (line === '.') {
            state.step = 'command';
            var email = fromRawMime(state.data, state.headers);
            email.from = { email: state.from, name: null };
            onEmail(email).catch(function(e) { console.error('[smtp] handler error:', e); });
            socket.write('250 OK Message accepted\r\n');
            state.data = '';
            state.headers = {};
            state.from = null;
            state.to = [];
          } else {
            state.data += line + '\n';
          }
        }
      }
    });
    socket.on('error', function() {});
  });
  server.on('error', function(e) { console.error('[smtp] server error:', e.message); });
  return server;
}

function createImapPoller(onEmail, pollInterval) {
  pollInterval = pollInterval || 60000;
  var pollTimer = null;
  var seenIds = {};
  function poll() {
    var ImapFlow = null;
    try { ImapFlow = require('imapflow'); } catch(e) { return; }
    var user = process.env.IMAP_USER;
    var password = process.env.IMAP_PASSWORD;
    var host = process.env.IMAP_HOST || 'imap.gmail.com';
    var port = parseInt(process.env.IMAP_PORT || '993', 10);
    var tls = process.env.IMAP_TLS !== 'false';
    var client = new ImapFlow({ host: host, port: port, tls: tls, auth: { user: user, pass: password } });
    client.connect().then(function() {
      return client.mailboxOpen('INBOX');
    }).then(function(mailbox) {
      return client.fetch({ seen: false, uid: { $gt: 0 } }, { envelope: true, source: true });
    }).then(function(messages) {
      var promises = [];
      messages.forEach(function(msg) {
        var uid = String(msg.uid);
        if (seenIds[uid]) return;
        seenIds[uid] = true;
        var email = fromRawMime(msg.source.toString(), {});
        promises.push(onEmail(email).then(function() {
          return client.messageSeen(uid);
        }).catch(function(e) { console.error('[imap] error:', e); }));
      });
      return Promise.all(promises).then(function() { return client.mailboxClose(); }).then(function() { return client.logout(); });
    }).catch(function(e) { console.error('[imap] poll error:', e.message); }).finally(function() {
      pollTimer = setTimeout(poll, pollInterval);
    });
  }
  return {
    start: function() { poll(); },
    stop: function() { if (pollTimer) clearTimeout(pollTimer); },
  };
}

module.exports = {
  normalizeEmail: normalizeEmail,
  fromSendGrid: fromSendGrid,
  fromSES: fromSES,
  fromMailgun: fromMailgun,
  fromPostmark: fromPostmark,
  createSmtpReceiver: createSmtpReceiver,
  createImapPoller: createImapPoller,
};
