const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.KB_PORT || 5466;

const MEMORY_OS = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const TWIN_OS = process.env.TWIN_OS_URL || 'http://localhost:4705';
const AI_INTELLIGENCE = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const documents = new Map();
const faqs = new Map();
const urls = new Map();
const knowledgeBases = new Map();
const embeddings = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowledge-base', port: PORT, timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: 'knowledge-base', version: '1.0.0' });
});

// POST /api/kb - Create knowledge base
app.post('/api/kb', (req, res) => {
  const { companyId, name, description, type, settings } = req.body;

  if (!companyId || !name) {
    return res.status(400).json({ success: false, error: 'companyId and name are required' });
  }

  const kbId = `kb_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const kb = {
    kbId,
    companyId,
    name,
    description: description || '',
    type: type || 'general',
    status: 'active',
    settings: settings || {
      embeddingModel: 'text-embedding-ada-002',
      chunkSize: 500,
      chunkOverlap: 50,
      topK: 5,
      minRelevanceScore: 0.7
    },
    stats: {
      documents: 0,
      faqs: 0,
      urls: 0,
      chunks: 0
    },
    createdAt: new Date().toISOString()
  };

  knowledgeBases.set(kbId, kb);

  res.json({
    success: true,
    data: kb
  });
});

// GET /api/kb - List knowledge bases
app.get('/api/kb', (req, res) => {
  const { companyId } = req.query;

  let result = Array.from(knowledgeBases.values());

  if (companyId) {
    result = result.filter(kb => kb.companyId === companyId);
  }

  res.json({
    success: true,
    data: result
  });
});

// GET /api/kb/:kbId - Get knowledge base
app.get('/api/kb/:kbId', (req, res) => {
  const { kbId } = req.params;
  const kb = knowledgeBases.get(kbId);

  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  res.json({
    success: true,
    data: kb
  });
});

// PUT /api/kb/:kbId - Update knowledge base
app.put('/api/kb/:kbId', (req, res) => {
  const { kbId } = req.params;
  const updates = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  const updated = { ...kb, ...updates, kbId, updatedAt: new Date().toISOString() };
  knowledgeBases.set(kbId, updated);

  res.json({
    success: true,
    data: updated
  });
});

// DELETE /api/kb/:kbId - Delete knowledge base
app.delete('/api/kb/:kbId', (req, res) => {
  const { kbId } = req.params;

  if (!knowledgeBases.has(kbId)) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  knowledgeBases.delete(kbId);

  documents.forEach((doc, id) => {
    if (doc.kbId === kbId) documents.delete(id);
  });
  faqs.forEach((faq, id) => {
    if (faq.kbId === kbId) faqs.delete(id);
  });
  urls.forEach((url, id) => {
    if (url.kbId === kbId) urls.delete(id);
  });

  res.json({ success: true, message: 'Knowledge base deleted' });
});

// POST /api/kb/:kbId/documents - Upload document reference
app.post('/api/kb/:kbId/documents', (req, res) => {
  const { kbId } = req.params;
  const { name, fileUrl, fileType, metadata } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!name || !fileUrl) {
    return res.status(400).json({ success: false, error: 'name and fileUrl are required' });
  }

  const docId = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const document = {
    docId,
    kbId,
    companyId: kb.companyId,
    name,
    fileUrl,
    fileType: fileType || extractFileType(fileUrl),
    status: 'uploaded',
    metadata: metadata || {},
    chunks: [],
    chunkCount: 0,
    createdAt: new Date().toISOString()
  };

  documents.set(docId, document);

  kb.stats.documents += 1;
  knowledgeBases.set(kbId, kb);

  storeInMemory('document', docId, document);

  res.json({
    success: true,
    data: document
  });
});

// POST /api/kb/:kbId/documents/bulk - Upload multiple documents
app.post('/api/kb/:kbId/documents/bulk', (req, res) => {
  const { kbId } = req.params;
  const { files } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'files array is required' });
  }

  const results = [];
  files.forEach(file => {
    if (file.name && file.fileUrl) {
      const docId = `doc_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const document = {
        docId,
        kbId,
        companyId: kb.companyId,
        name: file.name,
        fileUrl: file.fileUrl,
        fileType: file.fileType || extractFileType(file.fileUrl),
        status: 'uploaded',
        metadata: file.metadata || {},
        chunks: [],
        chunkCount: 0,
        createdAt: new Date().toISOString()
      };

      documents.set(docId, document);
      kb.stats.documents += 1;
      results.push(document);
    }
  });

  knowledgeBases.set(kbId, kb);

  res.json({
    success: true,
    data: {
      uploaded: results.length,
      documents: results
    }
  });
});

// GET /api/kb/:kbId/documents - List documents
app.get('/api/kb/:kbId/documents', (req, res) => {
  const { kbId } = req.params;
  const { status } = req.query;

  let result = Array.from(documents.values()).filter(d => d.kbId === kbId);

  if (status) {
    result = result.filter(d => d.status === status);
  }

  res.json({
    success: true,
    data: result
  });
});

// POST /api/kb/:kbId/urls - Add URL to crawl
app.post('/api/kb/:kbId/urls', (req, res) => {
  const { kbId } = req.params;
  const { url, name, selectors, schedule } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!url) {
    return res.status(400).json({ success: false, error: 'url is required' });
  }

  const urlId = `url_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const urlEntry = {
    urlId,
    kbId,
    companyId: kb.companyId,
    url,
    name: name || extractUrlName(url),
    status: 'pending',
    selectors: selectors || {
      title: 'h1, title',
      content: 'article, main, .content',
      exclude: 'nav, footer, header, .sidebar'
    },
    schedule: schedule || { type: 'manual' },
    lastCrawled: null,
    pageCount: 0,
    createdAt: new Date().toISOString()
  };

  urls.set(urlId, urlEntry);

  kb.stats.urls += 1;
  knowledgeBases.set(kbId, kb);

  res.json({
    success: true,
    data: urlEntry
  });
});

// POST /api/kb/:kbId/urls/bulk - Add multiple URLs
app.post('/api/kb/:kbId/urls/bulk', (req, res) => {
  const { kbId } = req.params;
  const { urlList } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!Array.isArray(urlList) || urlList.length === 0) {
    return res.status(400).json({ success: false, error: 'urlList array is required' });
  }

  const results = [];
  urlList.forEach(urlEntry => {
    if (urlEntry.url) {
      const urlId = `url_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const entry = {
        urlId,
        kbId,
        companyId: kb.companyId,
        url: urlEntry.url,
        name: urlEntry.name || extractUrlName(urlEntry.url),
        status: 'pending',
        selectors: urlEntry.selectors || {
          title: 'h1, title',
          content: 'article, main, .content',
          exclude: 'nav, footer, header, .sidebar'
        },
        schedule: urlEntry.schedule || { type: 'manual' },
        lastCrawled: null,
        pageCount: 0,
        createdAt: new Date().toISOString()
      };

      urls.set(urlId, entry);
      kb.stats.urls += 1;
      results.push(entry);
    }
  });

  knowledgeBases.set(kbId, kb);

  res.json({
    success: true,
    data: {
      added: results.length,
      urls: results
    }
  });
});

// GET /api/kb/:kbId/urls - List URLs
app.get('/api/kb/:kbId/urls', (req, res) => {
  const { kbId } = req.params;
  const { status } = req.query;

  let result = Array.from(urls.values()).filter(u => u.kbId === kbId);

  if (status) {
    result = result.filter(u => u.status === status);
  }

  res.json({
    success: true,
    data: result
  });
});

// POST /api/kb/:kbId/faqs - Add FAQ
app.post('/api/kb/:kbId/faqs', (req, res) => {
  const { kbId } = req.params;
  const { question, answer, category, tags, metadata } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!question || !answer) {
    return res.status(400).json({ success: false, error: 'question and answer are required' });
  }

  const faqId = `faq_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const faq = {
    faqId,
    kbId,
    companyId: kb.companyId,
    question,
    answer,
    category: category || 'general',
    tags: tags || [],
    metadata: metadata || {},
    usageCount: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    createdAt: new Date().toISOString()
  };

  faqs.set(faqId, faq);

  kb.stats.faqs += 1;
  knowledgeBases.set(kbId, kb);

  storeInMemory('faq', faqId, faq);

  res.json({
    success: true,
    data: faq
  });
});

// POST /api/kb/:kbId/faqs/import - Import FAQs from CSV or JSON
app.post('/api/kb/:kbId/faqs/import', (req, res) => {
  const { kbId } = req.params;
  const { faqs: faqList, format } = req.body;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  if (!Array.isArray(faqList) || faqList.length === 0) {
    return res.status(400).json({ success: false, error: 'faqs array is required' });
  }

  const results = [];
  faqList.forEach(faqData => {
    if (faqData.question && faqData.answer) {
      const faqId = `faq_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      const faq = {
        faqId,
        kbId,
        companyId: kb.companyId,
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category || 'general',
        tags: faqData.tags || [],
        metadata: faqData.metadata || {},
        usageCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        createdAt: new Date().toISOString()
      };

      faqs.set(faqId, faq);
      kb.stats.faqs += 1;
      results.push(faq);
    }
  });

  knowledgeBases.set(kbId, kb);

  res.json({
    success: true,
    data: {
      imported: results.length,
      faqs: results
    }
  });
});

// GET /api/kb/:kbId/faqs - List FAQs
app.get('/api/kb/:kbId/faqs', (req, res) => {
  const { kbId } = req.params;
  const { category, search, limit } = req.query;

  let result = Array.from(faqs.values()).filter(f => f.kbId === kbId);

  if (category) {
    result = result.filter(f => f.category === category);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(f =>
      f.question.toLowerCase().includes(searchLower) ||
      f.answer.toLowerCase().includes(searchLower)
    );
  }

  if (limit) {
    result = result.slice(0, parseInt(limit));
  }

  res.json({
    success: true,
    data: result
  });
});

// PUT /api/kb/:kbId/faqs/:faqId - Update FAQ
app.put('/api/kb/:kbId/faqs/:faqId', (req, res) => {
  const { kbId, faqId } = req.params;
  const updates = req.body;

  const faq = faqs.get(faqId);
  if (!faq || faq.kbId !== kbId) {
    return res.status(404).json({ success: false, error: 'FAQ not found' });
  }

  const updated = { ...faq, ...updates, faqId, updatedAt: new Date().toISOString() };
  faqs.set(faqId, updated);

  res.json({
    success: true,
    data: updated
  });
});

// DELETE /api/kb/:kbId/faqs/:faqId - Delete FAQ
app.delete('/api/kb/:kbId/faqs/:faqId', (req, res) => {
  const { kbId, faqId } = req.params;

  const faq = faqs.get(faqId);
  if (!faq || faq.kbId !== kbId) {
    return res.status(404).json({ success: false, error: 'FAQ not found' });
  }

  faqs.delete(faqId);

  const kb = knowledgeBases.get(kbId);
  if (kb) {
    kb.stats.faqs = Math.max(0, kb.stats.faqs - 1);
    knowledgeBases.set(kbId, kb);
  }

  res.json({ success: true, message: 'FAQ deleted' });
});

// POST /api/kb/:kbId/query - Query knowledge base with RAG
app.post('/api/kb/:kbId/query', async (req, res) => {
  try {
    const { kbId } = req.params;
    const { question, topK, filters } = req.body;

    const kb = knowledgeBases.get(kbId);
    if (!kb) {
      return res.status(404).json({ success: false, error: 'Knowledge base not found' });
    }

    if (!question) {
      return res.status(400).json({ success: false, error: 'question is required' });
    }

    const k = topK || kb.settings.topK || 5;

    const relevantFaqs = findRelevantFAQs(question, Array.from(faqs.values()).filter(f => f.kbId === kbId), k);

    const relevantDocs = findRelevantDocs(question, Array.from(documents.values()).filter(d => d.kbId === kbId), k);

    const relevantUrls = findRelevantUrls(question, Array.from(urls.values()).filter(u => u.kbId === kbId), k);

    const sources = [
      ...relevantFaqs.map(f => ({ type: 'faq', id: f.faqId, question: f.question, answer: f.answer, score: f.relevance })),
      ...relevantDocs.map(d => ({ type: 'document', id: d.docId, name: d.name, score: d.relevance })),
      ...relevantUrls.map(u => ({ type: 'url', id: u.urlId, name: u.name, url: u.url, score: u.relevance }))
    ].sort((a, b) => b.score - a.score).slice(0, k);

    relevantFaqs.forEach(f => {
      f.usageCount = (f.usageCount || 0) + 1;
      faqs.set(f.faqId, f);
    });

    let generatedAnswer = null;
    if (sources.length > 0 && sources[0].type === 'faq') {
      generatedAnswer = sources[0].answer;
    } else {
      generatedAnswer = await generateRAGAnswer(question, sources, kb);
    }

    res.json({
      success: true,
      data: {
        question,
        answer: generatedAnswer,
        sources,
        stats: {
          faqsSearched: relevantFaqs.length,
          docsSearched: relevantDocs.length,
          urlsSearched: relevantUrls.length
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/kb/:kbId/faqs/:faqId/feedback - Provide FAQ feedback
app.post('/api/kb/:kbId/faqs/:faqId/feedback', (req, res) => {
  const { kbId, faqId } = req.params;
  const { helpful } = req.body;

  const faq = faqs.get(faqId);
  if (!faq || faq.kbId !== kbId) {
    return res.status(404).json({ success: false, error: 'FAQ not found' });
  }

  if (helpful === true) {
    faq.helpfulCount = (faq.helpfulCount || 0) + 1;
  } else if (helpful === false) {
    faq.notHelpfulCount = (faq.notHelpfulCount || 0) + 1;
  }

  faqs.set(faqId, faq);

  res.json({
    success: true,
    data: {
      faqId,
      helpfulCount: faq.helpfulCount,
      notHelpfulCount: faq.notHelpfulCount,
      helpfulRate: faq.helpfulCount + faq.notHelpfulCount > 0
        ? ((faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount)) * 100).toFixed(2)
        : 0
    }
  });
});

// GET /api/kb/:kbId/analytics - Get knowledge base analytics
app.get('/api/kb/:kbId/analytics', (req, res) => {
  const { kbId } = req.params;

  const kb = knowledgeBases.get(kbId);
  if (!kb) {
    return res.status(404).json({ success: false, error: 'Knowledge base not found' });
  }

  const kbFaqs = Array.from(faqs.values()).filter(f => f.kbId === kbId);
  const kbDocs = Array.from(documents.values()).filter(d => d.kbId === kbId);
  const kbUrls = Array.from(urls.values()).filter(u => u.kbId === kbId);

  const totalFaqUsage = kbFaqs.reduce((sum, f) => sum + (f.usageCount || 0), 0);
  const totalHelpful = kbFaqs.reduce((sum, f) => sum + (f.helpfulCount || 0), 0);
  const totalNotHelpful = kbFaqs.reduce((sum, f) => sum + (f.notHelpfulCount || 0), 0);

  const faqCategories = {};
  kbFaqs.forEach(f => {
    const cat = f.category || 'general';
    faqCategories[cat] = (faqCategories[cat] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      kb: {
        kbId,
        name: kb.name,
        status: kb.status
      },
      stats: {
        documents: kbDocs.length,
        faqs: kbFaqs.length,
        urls: kbUrls.length,
        chunks: kb.stats.chunks
      },
      faqAnalytics: {
        totalQueries: totalFaqUsage,
        helpfulCount: totalHelpful,
        notHelpfulCount: totalNotHelpful,
        helpfulRate: totalHelpful + totalNotHelpful > 0
          ? ((totalHelpful / (totalHelpful + totalNotHelpful)) * 100).toFixed(2)
          : 0,
        byCategory: faqCategories
      },
      topFaqs: kbFaqs
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10)
        .map(f => ({
          faqId: f.faqId,
          question: f.question,
          usageCount: f.usageCount,
          helpfulRate: f.helpfulCount + f.notHelpfulCount > 0
            ? ((f.helpfulCount / (f.helpfulCount + f.notHelpfulCount)) * 100).toFixed(2)
            : 0
        }))
    }
  });
});

// ─── Helper Functions ──────────────────────────────────

function extractFileType(url) {
  const ext = path.extname(url).toLowerCase();
  const types = {
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.txt': 'txt',
    '.md': 'markdown',
    '.html': 'html',
    '.json': 'json'
  };
  return types[ext] || 'unknown';
}

function extractUrlName(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '') + parsed.pathname;
  } catch {
    return url.slice(0, 50);
  }
}

function findRelevantFAQs(query, faqs, k) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  return faqs
    .map(faq => {
      const questionLower = faq.question.toLowerCase();
      const answerLower = faq.answer.toLowerCase();

      let score = 0;

      queryWords.forEach(word => {
        if (questionLower.includes(word)) score += 3;
        if (answerLower.includes(word)) score += 1;
      });

      if (questionLower.includes(queryLower)) score += 10;

      return { ...faq, relevance: score / 10 };
    })
    .filter(f => f.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, k);
}

function findRelevantDocs(query, docs, k) {
  const queryWords = query.toLowerCase().split(/\s+/);

  return docs
    .map(doc => {
      const nameLower = doc.name.toLowerCase();
      let score = 0;

      queryWords.forEach(word => {
        if (nameLower.includes(word)) score += 2;
      });

      return { ...doc, relevance: score };
    })
    .filter(d => d.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, k);
}

function findRelevantUrls(query, urls, k) {
  const queryWords = query.toLowerCase().split(/\s+/);

  return urls
    .map(urlEntry => {
      const nameLower = urlEntry.name.toLowerCase();
      const urlLower = urlEntry.url.toLowerCase();
      let score = 0;

      queryWords.forEach(word => {
        if (nameLower.includes(word)) score += 2;
        if (urlLower.includes(word)) score += 1;
      });

      return { ...urlEntry, relevance: score };
    })
    .filter(u => u.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, k);
}

async function generateRAGAnswer(question, sources, kb) {
  if (sources.length === 0) {
    return 'I could not find relevant information in the knowledge base to answer your question.';
  }

  try {
    const response = await axios.post(`${AI_INTELLIGENCE}/api/ai/generate`, {
      prompt: `Based on the following information from the knowledge base, answer the question.\n\nQuestion: ${question}\n\nInformation:\n${sources.map(s => {
        if (s.type === 'faq') return `FAQ: ${s.question}\nAnswer: ${s.answer}`;
        if (s.type === 'document') return `Document: ${s.name}`;
        if (s.type === 'url') return `URL: ${s.name} (${s.url})`;
        return '';
      }).filter(Boolean).join('\n\n')}`,
      maxTokens: 500
    }, { timeout: 10000 });

    return response.data.generated_text || generateSimpleAnswer(sources);
  } catch (error) {
    return generateSimpleAnswer(sources);
  }
}

function generateSimpleAnswer(sources) {
  const faqs = sources.filter(s => s.type === 'faq');

  if (faqs.length > 0) {
    return `${faqs[0].answer}\n\nSource: ${faqs[0].question}`;
  }

  if (sources.length === 1) {
    if (sources[0].type === 'document') {
      return `I found a relevant document: "${sources[0].name}". Please refer to this document for more details.`;
    }
    if (sources[0].type === 'url') {
      return `I found a relevant resource: "${sources[0].name}". Visit ${sources[0].url} for more information.`;
    }
  }

  return `I found ${sources.length} relevant source(s) in the knowledge base. Please provide more specific keywords to get a detailed answer.`;
}

async function storeInMemory(type, id, data) {
  try {
    await axios.post(`${MEMORY_OS}/api/memory/store`, {
      type: `kb_${type}`,
      entityId: id,
      data
    }, { timeout: 5000 });
  } catch (error) {
    console.log(`[KB] Memory store failed: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`Knowledge Base service running on port ${PORT}`);
  console.log(`Memory OS: ${MEMORY_OS}`);
  console.log(`AI Intelligence: ${AI_INTELLIGENCE}`);
});

module.exports = app;
