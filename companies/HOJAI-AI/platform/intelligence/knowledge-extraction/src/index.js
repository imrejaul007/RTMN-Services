/**
 * RTMN Knowledge Extraction Service
 * Port: 4784
 *
 * Sits alongside the RAG Platform (4781) and Document Intelligence (4782).
 * Pulls structured information out of raw text — entities, links to a knowledge
 * base, and (subject, predicate, object) triples. Three independent extractors
 * plus a unified /api/extract-all endpoint.
 *
 *   1. NER  — Named Entity Recognition (rule + pattern based, no LLM)
 *   2. Link — Entity Linking against an in-memory KB with fuzzy matching
 *   3. Fact — (subject, predicate, object) triple extraction
 *
 * Pure regex + rules for v1. Designed to be swapped for a real model later.
 *
 * @author HOJAI AI
 * @version 1.0.0
 */

'use strict';

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4784;
const SERVICE_NAME = 'knowledge-extraction';
const SERVICE_VERSION = '1.0.0';
const startedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// Middleware & app skeleton
// ---------------------------------------------------------------------------
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '5mb' }));

// Request log
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// /health -> /api/health
app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function principalOf(req) {
  return (
    req.headers['x-actor'] ||
    req.headers['x-principal'] ||
    req.headers['x-user-id'] ||
    (req.headers.authorization ? 'auth:' + req.headers.authorization.slice(0, 12) : 'anonymous')
  );
}

const auditLog = [];
function audit(entry) {
  auditLog.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (auditLog.length > 10000) auditLog.shift();
}

// ---------------------------------------------------------------------------
// Cumulative stats
// ---------------------------------------------------------------------------
const stats = {
  extractionsRun: 0,
  entitiesFound: 0,
  factsExtracted: 0,
  linksMade: 0,
  errors: 0,
  byType: {}
};

function bumpType(type, n = 1) {
  stats.byType[type] = (stats.byType[type] || 0) + n;
}

// ---------------------------------------------------------------------------
// Entity type registry
// ---------------------------------------------------------------------------
const ENTITY_TYPES = {
  PERSON:   { description: 'Person names',                          example: 'Albert Einstein, Steve Jobs' },
  ORG:      { description: 'Organizations (companies, agencies)',    example: 'Google, United Nations' },
  LOCATION: { description: 'Cities, countries, regions, addresses',  example: 'Paris, California, Tokyo' },
  DATE:     { description: 'Dates in any common format',             example: 'April 1 1976, 2024-01-15' },
  TIME:     { description: 'Times of day',                           example: '3:30 PM, 14:00' },
  MONEY:    { description: 'Monetary amounts with currency',         example: '$1,000, €50, £25.99' },
  PERCENT:  { description: 'Percentages',                            example: '50%, 12.5 percent' },
  EMAIL:    { description: 'Email addresses',                        example: 'user@example.com' },
  PHONE:    { description: 'Phone numbers (US + international)',     example: '+1-408-996-1010, (555) 123-4567' },
  URL:      { description: 'Web URLs',                               example: 'https://example.com' },
  HASH:     { description: 'Hex hashes (md5/sha1/sha256, 32+ chars)', example: '5d41402abc4b2a76b9719d911017c592' },
  IP:       { description: 'IPv4 and IPv6 addresses',                example: '192.168.1.1, 2001:db8::1' },
  PRODUCT:  { description: 'Product-like proper nouns',              example: 'iPhone 15, Tesla Model 3' },
  EVENT:    { description: 'Event-like proper nouns',                example: 'CES 2024, Web Summit' },
  LANGUAGE: { description: 'Programming or natural languages',       example: 'Python, JavaScript, Mandarin' },
  TECH:     { description: 'Tech terms from built-in catalog',       example: 'React, PostgreSQL, Kubernetes' }
};

// ---------------------------------------------------------------------------
// Regexes (pre-compiled at module load)
// ---------------------------------------------------------------------------

// --- Strong patterns (very high confidence) ---
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE   = /\bhttps?:\/\/[^\s<>"']+/gi;
const HASH_RE  = /\b[0-9a-fA-F]{32,64}\b/g;
const IPV4_RE  = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const IPV6_RE  = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b|::1\b|::\b/g;
// MD5 (32 hex), SHA1 (40 hex), SHA256 (64 hex) — covered by HASH_RE; we expose the same.

const PHONE_INTL_RE = /(?:\+|00)\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?/g;
const PHONE_US_RE   = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

const MONEY_RE = /(?:\$|€|£|¥|₹|USD|EUR|GBP|JPY|INR)\s?\d{1,3}(?:[,]\d{3})*(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\s?(?:dollars?|euros?|pounds?|yen|rupees?)\b/gi;
const PERCENT_RE = /\b\d+(?:\.\d+)?\s?%|percent\b/gi;

const TIME_RE = /\b(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[apAP][mM])?|\b\d{1,2}\s?[apAP][mM]\b/g;

// Dates
const DATE_PATTERNS = [
  // 2024-01-15, 2024/01/15
  /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b/g,
  // Jan 15 2024, January 15, 2024
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,)?\s+\d{2,4}\b/gi,
  // 15 Jan 2024, 15 January 2024
  /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4}\b/gi,
  // April 1, 1976
  /\b(?:April|March|May|June|July|August|September|October|November|December|January|February)\s+\d{1,2},?\s+\d{2,4}\b/gi
];

// Event indicators
const EVENT_KEYWORDS = /\b(?:Summit|Conference|Convention|Expo|Festival|Olympics|Cup|Championship|Forum|Symposium|Hackathon|Meets?|Awards?|Day|Week|Year)\b/i;

// Product indicator: "the X" where X is a capitalized phrase
const PRODUCT_AFTER_THE = /\bthe\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z0-9][A-Za-z0-9]*){0,3})\b/g;

// Sentence splitter — protect common abbreviations
function splitSentences(text) {
  if (!text) return [];
  // Replace common abbreviations with protected form
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|Inc|Ltd|Co|Corp|LLC|vs|etc|e\.g|i\.e|U\.S|U\.K|N\.Y)\./g, '$1<DOT>');

  const raw = protectedText.split(/(?<=[.!?])\s+|\n+/);
  return raw
    .map(s => s.replace(/<DOT>/g, '.').trim())
    .filter(s => s.length > 0);
}

// ---------------------------------------------------------------------------
// Built-in TECH catalog (100+ terms)
// ---------------------------------------------------------------------------
const TECH_CATALOG = [
  // Programming languages
  'Python','JavaScript','TypeScript','Java','Go','Rust','C++','C#','Ruby','PHP',
  'Swift','Kotlin','Scala','R','MATLAB','SQL','HTML','CSS','Bash','PowerShell',
  'Perl','Lua','Dart','Haskell','Elixir','Clojure','Groovy','Objective-C','F#','Erlang',
  // Frontend frameworks
  'React','Vue','Angular','Svelte','Next.js','Nuxt.js','Solid','Ember','Backbone','Preact',
  'jQuery','Redux','MobX','Tailwind','Bootstrap','Material UI','Chakra UI',
  // Backend frameworks
  'Express','Fastify','Django','Flask','Rails','Spring','Laravel','Symfony','.NET','ASP.NET',
  'NestJS','Koa','Hapi','Phoenix','Gin','Echo','FastAPI','Actix',
  // Databases
  'PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','Cassandra','DynamoDB','BigQuery','Snowflake','SQLite',
  'MariaDB','Oracle','SQL Server','Neo4j','InfluxDB','CouchDB','RethinkDB','TimescaleDB','Firebase','Supabase',
  'CosmosDB','CockroachDB',
  // Cloud providers / hosting
  'AWS','Azure','GCP','Google Cloud','Cloudflare','Vercel','Netlify','Heroku','DigitalOcean','Linode',
  'Render','Fly.io','Railway',
  // DevOps / infra
  'Docker','Kubernetes','Helm','Terraform','Ansible','Jenkins','GitHub Actions','GitLab CI','CircleCI','ArgoCD',
  'Istio','Prometheus','Grafana','Datadog','Splunk','ELK','Pulumi','Vagrant','Packer','Consul',
  'Vault','Nomad','Spinnaker',
  // ML / AI frameworks
  'TensorFlow','PyTorch','Keras','Scikit-learn','Hugging Face','OpenAI','Anthropic','Claude','GPT','LLaMA',
  'Mistral','Cohere','Stable Diffusion','Midjourney','JAX','ONNX','Pandas','NumPy','Matplotlib','Plotly',
  'LangChain','LlamaIndex','Weights & Biases','MLflow','Ray','XGBoost','LightGBM',
  // Mobile / cross-platform
  'React Native','Flutter','SwiftUI','Jetpack Compose','Electron','Tauri','Xamarin','Ionic','Cordova','Capacitor',
  // Messaging / protocols
  'Kafka','RabbitMQ','NATS','gRPC','GraphQL','REST','WebSockets','MQTT','AMQP','STOMP',
  // Auth / security
  'OAuth','JWT','SAML','OpenID','LDAP','Kerberos','SSL','TLS','mTLS',
  // Tools
  'Git','Linux','Vim','VS Code','IntelliJ','Xcode','Android Studio','Eclipse','Sublime','Atom',
  'Webpack','Vite','Rollup','Parcel','Babel','ESLint','Prettier','Jest','Mocha','Cypress',
  'Playwright','Selenium','Postman'
];

// Dedupe + lowercase index for fast lookup
const TECH_CATALOG_SET = new Set(TECH_CATALOG.map(t => t.toLowerCase()));

// ---------------------------------------------------------------------------
// Built-in PERSON catalog
// ---------------------------------------------------------------------------
const PERSON_CATALOG = [
  // Scientists
  { name: 'Albert Einstein',       aliases: ['Einstein'] },
  { name: 'Isaac Newton',          aliases: ['Newton'] },
  { name: 'Marie Curie',           aliases: ['Curie'] },
  { name: 'Charles Darwin',        aliases: ['Darwin'] },
  { name: 'Galileo Galilei',       aliases: ['Galileo'] },
  { name: 'Leonardo da Vinci',     aliases: ['da Vinci', 'Leonardo'] },
  { name: 'Nikola Tesla',          aliases: ['Tesla'] },
  { name: 'Thomas Edison',         aliases: ['Edison'] },
  { name: 'Alexander Graham Bell', aliases: ['Bell'] },
  { name: 'Ada Lovelace',          aliases: ['Lovelace'] },
  { name: 'Alan Turing',           aliases: ['Turing'] },
  { name: 'Grace Hopper',          aliases: ['Hopper'] },
  { name: 'Stephen Hawking',       aliases: ['Hawking'] },
  { name: 'Richard Feynman',       aliases: ['Feynman'] },
  // Business leaders
  { name: 'Steve Jobs',            aliases: ['Jobs'] },
  { name: 'Bill Gates',            aliases: ['Gates'] },
  { name: 'Elon Musk',             aliases: ['Musk'] },
  { name: 'Jeff Bezos',            aliases: ['Bezos'] },
  { name: 'Mark Zuckerberg',       aliases: ['Zuckerberg'] },
  { name: 'Larry Page',            aliases: ['Page'] },
  { name: 'Sergey Brin',           aliases: ['Brin'] },
  { name: 'Sundar Pichai',         aliases: ['Pichai'] },
  { name: 'Satya Nadella',         aliases: ['Nadella'] },
  { name: 'Tim Cook',              aliases: ['Cook'] },
  { name: 'Warren Buffett',        aliases: ['Buffett'] },
  { name: 'Jensen Huang',          aliases: ['Huang'] },
  { name: 'Sam Altman',            aliases: ['Altman'] },
  { name: 'Dario Amodei',          aliases: ['Amodei'] },
  { name: 'Demis Hassabis',        aliases: ['Hassabis'] },
  { name: 'Marc Andreessen',       aliases: ['Andreessen'] },
  { name: 'Jack Dorsey',           aliases: ['Dorsey'] },
  { name: 'Reed Hastings',         aliases: ['Hastings'] },
  { name: 'Sheryl Sandberg',       aliases: ['Sandberg'] },
  { name: 'Susan Wojcicki',        aliases: ['Wojcicki'] }
];

// ---------------------------------------------------------------------------
// Built-in ORG catalog
// ---------------------------------------------------------------------------
const ORG_CATALOG = [
  // Tech giants
  { name: 'Google',     aliases: ['Alphabet', 'Alphabet Inc'] },
  { name: 'Apple',      aliases: ['Apple Inc'] },
  { name: 'Microsoft',  aliases: ['MSFT'] },
  { name: 'Amazon',     aliases: ['AWS', 'Amazon.com'] },
  { name: 'Meta',       aliases: ['Facebook'] },
  { name: 'Netflix',    aliases: [] },
  { name: 'Tesla',      aliases: ['Tesla Inc', 'Tesla Motors'] },
  { name: 'OpenAI',     aliases: [] },
  { name: 'Anthropic',  aliases: [] },
  { name: 'IBM',        aliases: ['International Business Machines'] },
  { name: 'Oracle',     aliases: [] },
  { name: 'SAP',        aliases: [] },
  { name: 'Salesforce', aliases: [] },
  { name: 'Adobe',      aliases: [] },
  { name: 'Intel',      aliases: [] },
  { name: 'AMD',        aliases: ['Advanced Micro Devices'] },
  { name: 'NVIDIA',     aliases: [] },
  { name: 'Qualcomm',   aliases: [] },
  { name: 'Cisco',      aliases: [] },
  { name: 'Dell',       aliases: ['Dell Technologies'] },
  { name: 'HP',         aliases: ['Hewlett-Packard'] },
  { name: 'Lenovo',     aliases: [] },
  { name: 'Samsung',    aliases: ['Samsung Electronics'] },
  { name: 'Sony',       aliases: [] },
  { name: 'LG',         aliases: ['LG Electronics'] },
  // Auto
  { name: 'Toyota',     aliases: [] },
  { name: 'Honda',      aliases: [] },
  { name: 'BMW',        aliases: ['Bayerische Motoren Werke'] },
  { name: 'Mercedes',   aliases: ['Mercedes-Benz'] },
  { name: 'Volkswagen', aliases: ['VW'] },
  { name: 'Ford',       aliases: [] },
  { name: 'GM',         aliases: ['General Motors'] },
  // Consumer / retail
  { name: 'Disney',     aliases: ['Walt Disney'] },
  { name: 'Coca-Cola',  aliases: ['Coke'] },
  { name: 'PepsiCo',    aliases: ['Pepsi'] },
  { name: 'Walmart',    aliases: [] },
  { name: 'Target',     aliases: [] },
  { name: 'Costco',     aliases: [] }
];

// ---------------------------------------------------------------------------
// Built-in LOCATION catalog
// ---------------------------------------------------------------------------
const LOCATION_CATALOG = [
  // US
  { name: 'New York',       aliases: ['NYC', 'New York City'] },
  { name: 'San Francisco',  aliases: ['SF'] },
  { name: 'Los Angeles',    aliases: ['LA'] },
  { name: 'Chicago',        aliases: [] },
  { name: 'Boston',         aliases: [] },
  { name: 'Seattle',        aliases: [] },
  { name: 'Austin',         aliases: [] },
  { name: 'Miami',          aliases: [] },
  { name: 'Cupertino',      aliases: [] },
  // Cities
  { name: 'London',         aliases: [] },
  { name: 'Paris',          aliases: [] },
  { name: 'Berlin',         aliases: [] },
  { name: 'Tokyo',          aliases: [] },
  { name: 'Seoul',          aliases: [] },
  { name: 'Beijing',        aliases: [] },
  { name: 'Shanghai',       aliases: [] },
  { name: 'Hong Kong',      aliases: [] },
  { name: 'Singapore',      aliases: [] },
  { name: 'Sydney',         aliases: [] },
  { name: 'Melbourne',      aliases: [] },
  { name: 'Toronto',        aliases: [] },
  { name: 'Vancouver',      aliases: [] },
  { name: 'Mumbai',         aliases: ['Bombay'] },
  { name: 'Delhi',          aliases: ['New Delhi'] },
  { name: 'Bangalore',      aliases: ['Bengaluru'] },
  { name: 'Dubai',          aliases: [] },
  { name: 'Riyadh',         aliases: [] },
  { name: 'Tel Aviv',       aliases: [] },
  { name: 'Cairo',          aliases: [] },
  { name: 'Lagos',          aliases: [] },
  { name: 'Johannesburg',   aliases: [] },
  { name: 'São Paulo',      aliases: ['Sao Paulo'] },
  { name: 'Mexico City',    aliases: [] },
  { name: 'Buenos Aires',   aliases: [] },
  { name: 'Moscow',         aliases: [] },
  { name: 'Istanbul',       aliases: [] },
  { name: 'Amsterdam',      aliases: [] },
  { name: 'Madrid',         aliases: [] },
  { name: 'Rome',           aliases: [] },
  { name: 'Stockholm',      aliases: [] },
  { name: 'Helsinki',       aliases: [] },
  { name: 'Zurich',         aliases: [] },
  { name: 'Geneva',         aliases: [] },
  { name: 'Vienna',         aliases: [] },
  { name: 'Warsaw',         aliases: [] },
  { name: 'Dublin',         aliases: [] },
  // Countries
  { name: 'United States',  aliases: ['USA', 'U.S.', 'US', 'America'] },
  { name: 'United Kingdom', aliases: ['UK', 'U.K.', 'Britain', 'England'] },
  { name: 'Canada',         aliases: [] },
  { name: 'Germany',        aliases: [] },
  { name: 'France',         aliases: [] },
  { name: 'Japan',          aliases: [] },
  { name: 'China',          aliases: ['PRC'] },
  { name: 'India',          aliases: [] },
  { name: 'Australia',      aliases: [] },
  { name: 'Brazil',         aliases: [] },
  { name: 'Russia',         aliases: [] },
  { name: 'Italy',          aliases: [] },
  { name: 'Spain',          aliases: [] },
  { name: 'Mexico',         aliases: [] },
  { name: 'South Korea',    aliases: ['Korea'] },
  { name: 'Netherlands',    aliases: ['Holland'] },
  { name: 'Switzerland',    aliases: [] },
  { name: 'Sweden',         aliases: [] },
  { name: 'Norway',         aliases: [] },
  { name: 'Denmark',        aliases: [] },
  { name: 'Finland',        aliases: [] },
  { name: 'Israel',         aliases: [] },
  { name: 'Saudi Arabia',   aliases: [] }
];

// ---------------------------------------------------------------------------
// Programming/natural languages (LANGUAGE type)
// ---------------------------------------------------------------------------
const LANGUAGE_CATALOG = [
  'Python','JavaScript','TypeScript','Java','Go','Rust','C++','C#','Ruby','PHP',
  'Swift','Kotlin','Scala','R','Perl','Lua','Dart','Haskell','Elixir','Clojure',
  'English','Spanish','French','German','Mandarin','Chinese','Japanese','Korean',
  'Hindi','Arabic','Portuguese','Russian','Italian','Dutch','Swedish','Turkish',
  'Hebrew','Greek','Latin'
];

// ---------------------------------------------------------------------------
// In-memory knowledge base (seeded)
// ---------------------------------------------------------------------------
// kbEntities: id -> { id, canonical, type, aliases, properties, createdAt }
const kbEntities = new PersistentMap('kb-entities', { serviceName: 'knowledge-extraction' });

// Index by lowercase canonical + aliases for fast lookup
const kbIndex = new PersistentMap('kb-index', { serviceName: 'knowledge-extraction' }); // key: `${type}:${lower}` -> id

function indexKey(type, name) {
  return `${type}:${String(name || '').toLowerCase()}`;
}

function addToIndex(entry) {
  kbIndex.set(indexKey(entry.type, entry.canonical), entry.id);
  for (const a of (entry.aliases || [])) {
    kbIndex.set(indexKey(entry.type, a), entry.id);
  }
}

function removeFromIndex(entry) {
  kbIndex.delete(indexKey(entry.type, entry.canonical));
  for (const a of (entry.aliases || [])) {
    kbIndex.delete(indexKey(entry.type, a));
  }
}

function seedKB() {
  // Use deterministic IDs so the seed is stable across restarts
  const seed = [
    // Persons
    ...PERSON_CATALOG.map((p, i) => ({
      id: `kb-person-${i + 1}`,
      canonical: p.name,
      type: 'PERSON',
      aliases: p.aliases,
      properties: { source: 'catalog:person' }
    })),
    // Orgs
    ...ORG_CATALOG.map((o, i) => ({
      id: `kb-org-${i + 1}`,
      canonical: o.name,
      type: 'ORG',
      aliases: o.aliases,
      properties: { source: 'catalog:org' }
    })),
    // Locations
    ...LOCATION_CATALOG.map((l, i) => ({
      id: `kb-loc-${i + 1}`,
      canonical: l.name,
      type: 'LOCATION',
      aliases: l.aliases,
      properties: { source: 'catalog:location' }
    })),
    // Tech
    ...TECH_CATALOG.map((t, i) => ({
      id: `kb-tech-${i + 1}`,
      canonical: t,
      type: 'TECH',
      aliases: [],
      properties: { source: 'catalog:tech' }
    }))
  ];

  // Add a few hand-curated PRODUCTs
  const products = [
    { id: 'kb-prod-1', canonical: 'iPhone',        type: 'PRODUCT', aliases: ['iPhone 15', 'iPhone 14'], properties: { brand: 'Apple' } },
    { id: 'kb-prod-2', canonical: 'MacBook',       type: 'PRODUCT', aliases: ['MacBook Pro', 'MacBook Air'], properties: { brand: 'Apple' } },
    { id: 'kb-prod-3', canonical: 'Tesla Model 3', type: 'PRODUCT', aliases: ['Model 3'],                  properties: { brand: 'Tesla' } },
    { id: 'kb-prod-4', canonical: 'Galaxy',        type: 'PRODUCT', aliases: ['Galaxy S24', 'Samsung Galaxy'], properties: { brand: 'Samsung' } },
    { id: 'kb-prod-5', canonical: 'Surface',       type: 'PRODUCT', aliases: ['Surface Pro'],              properties: { brand: 'Microsoft' } }
  ];
  seed.push(...products);

  for (const e of seed) {
    kbEntities.set(e.id, e);
    addToIndex(e);
  }
}

// ---------------------------------------------------------------------------
// Fuzzy matching — Levenshtein distance
// ---------------------------------------------------------------------------
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,      // insertion
        v0[j + 1] + 1,  // deletion
        v0[j] + cost    // substitution
      );
    }
    for (let k = 0; k <= b.length; k++) v0[k] = v1[k];
  }
  return v1[b.length];
}

function similarity(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - (dist / maxLen);
}

// ---------------------------------------------------------------------------
// Overlap resolution for NER — prefer longest, then highest priority
// ---------------------------------------------------------------------------
const TYPE_PRIORITY = {
  EMAIL: 100, URL: 95, HASH: 90, IP: 88, PHONE: 85,
  DATE: 75, TIME: 73, MONEY: 70, PERCENT: 65,
  EVENT: 60, PRODUCT: 55, LANGUAGE: 50, TECH: 45,
  PERSON: 40, ORG: 38, LOCATION: 35
};

function resolveOverlaps(matches) {
  if (matches.length === 0) return [];

  // Sort by length desc, then priority desc
  matches.sort((a, b) => {
    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;
    return (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0);
  });

  const kept = [];
  for (const m of matches) {
    const overlap = kept.some(k => !(m.end <= k.start || m.start >= k.end));
    if (!overlap) kept.push(m);
  }

  // Restore text order
  kept.sort((a, b) => a.start - b.start);
  return kept;
}

// ---------------------------------------------------------------------------
// NER — main extractor
// ---------------------------------------------------------------------------
function extractEntities(text, options = {}) {
  if (typeof text !== 'string' || !text) return [];

  const typesFilter = options.types && options.types.length
    ? new Set(options.types)
    : null;

  const matches = [];

  const add = (type, start, end, confidence) => {
    if (typesFilter && !typesFilter.has(type)) return;
    if (start < 0 || end > text.length || start >= end) return;
    matches.push({
      type,
      text: text.slice(start, end),
      start,
      end,
      confidence
    });
  };

  // Email
  for (const m of text.matchAll(EMAIL_RE)) add('EMAIL', m.index, m.index + m[0].length, 0.99);

  // URL
  for (const m of text.matchAll(URL_RE)) add('URL', m.index, m.index + m[0].length, 0.99);

  // Hash (md5/sha1/sha256)
  for (const m of text.matchAll(HASH_RE)) {
    const len = m[0].length;
    let conf = 0.85;
    if (len === 32) conf = 0.9;        // md5
    else if (len === 40) conf = 0.95;  // sha1
    else if (len === 64) conf = 0.98;  // sha256
    add('HASH', m.index, m.index + len, conf);
  }

  // IP (v4 and v6)
  for (const m of text.matchAll(IPV4_RE)) add('IP', m.index, m.index + m[0].length, 0.95);
  for (const m of text.matchAll(IPV6_RE)) {
    // Filter out things that don't look like IP — need colons
    if (m[0].includes(':') && m[0].length >= 4) {
      add('IP', m.index, m.index + m[0].length, 0.85);
    }
  }

  // Phone — intl first (more specific), then US
  for (const m of text.matchAll(PHONE_INTL_RE)) {
    // Need at least 7 digits in the match to be a phone
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 16) {
      add('PHONE', m.index, m.index + m[0].length, 0.9);
    }
  }
  for (const m of text.matchAll(PHONE_US_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length === 10) {
      add('PHONE', m.index, m.index + m[0].length, 0.88);
    }
  }

  // Money
  for (const m of text.matchAll(MONEY_RE)) add('MONEY', m.index, m.index + m[0].length, 0.92);

  // Percent
  for (const m of text.matchAll(PERCENT_RE)) add('PERCENT', m.index, m.index + m[0].length, 0.95);

  // Time
  for (const m of text.matchAll(TIME_RE)) add('TIME', m.index, m.index + m[0].length, 0.9);

  // Dates
  for (const re of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) add('DATE', m.index, m.index + m[0].length, 0.88);
  }

  // TECH — whole-word match from the catalog (case-sensitive to reduce false positives)
  for (const term of TECH_CATALOG) {
    // Word boundary; allow dots, plus, hash, hyphens within term
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    for (const m of text.matchAll(re)) {
      add('TECH', m.index, m.index + m[0].length, 0.9);
    }
  }

  // LANGUAGE — similar to TECH but from LANGUAGE_CATALOG
  for (const term of LANGUAGE_CATALOG) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    for (const m of text.matchAll(re)) {
      add('LANGUAGE', m.index, m.index + m[0].length, 0.85);
    }
  }

  // PERSON — match against PERSON_CATALOG (full names first, then aliases)
  // Sort by length desc so "Albert Einstein" matches before "Einstein"
  const personTerms = [];
  for (const p of PERSON_CATALOG) {
    personTerms.push(p.name);
    for (const a of p.aliases) personTerms.push(a);
  }
  personTerms.sort((a, b) => b.length - a.length);
  for (const term of personTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    for (const m of text.matchAll(re)) {
      // First / last name alone can be a common word; require minimum length 4 OR
      // a multi-word name OR a capitalized first letter (proper noun)
      if (term.length >= 4 || term.includes(' ')) {
        add('PERSON', m.index, m.index + m[0].length, 0.85);
      }
    }
  }

  // ORG — match against ORG_CATALOG
  const orgTerms = [];
  for (const o of ORG_CATALOG) {
    orgTerms.push(o.name);
    for (const a of o.aliases) orgTerms.push(a);
  }
  orgTerms.sort((a, b) => b.length - a.length);
  for (const term of orgTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    for (const m of text.matchAll(re)) {
      add('ORG', m.index, m.index + m[0].length, 0.9);
    }
  }

  // LOCATION — match against LOCATION_CATALOG
  const locTerms = [];
  for (const l of LOCATION_CATALOG) {
    locTerms.push(l.name);
    for (const a of l.aliases) locTerms.push(a);
  }
  locTerms.sort((a, b) => b.length - a.length);
  for (const term of locTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'g');
    for (const m of text.matchAll(re)) {
      add('LOCATION', m.index, m.index + m[0].length, 0.9);
    }
  }

  // EVENT — capitalized phrase with event keywords nearby
  // "World Economic Forum", "CES 2024", "Web Summit"
  for (const m of text.matchAll(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,4})\s+(Summit|Conference|Convention|Expo|Festival|Olympics|Cup|Championship|Forum|Symposium|Hackathon|Meet|Awards?|Day|Week)\b/g)) {
    add('EVENT', m.index, m.index + m[0].length, 0.85);
  }
  // "CES 2024" — all-caps acronym + year
  for (const m of text.matchAll(/\b([A-Z]{2,6})\s+(\d{4})\b/g)) {
    add('EVENT', m.index, m.index + m[0].length, 0.8);
  }

  // PRODUCT — capitalized phrase after "the"
  for (const m of text.matchAll(PRODUCT_AFTER_THE)) {
    const fullMatch = m[0];
    const productName = m[1];
    const productStart = m.index + (fullMatch.length - productName.length);
    // Only treat as PRODUCT if it's not already a known ORG/PERSON/LOCATION
    const wouldBeOrg = ORG_CATALOG.some(o =>
      o.name.toLowerCase() === productName.toLowerCase() ||
      o.aliases.some(a => a.toLowerCase() === productName.toLowerCase())
    );
    const wouldBePerson = PERSON_CATALOG.some(p =>
      p.name.toLowerCase() === productName.toLowerCase() ||
      p.aliases.some(a => a.toLowerCase() === productName.toLowerCase())
    );
    const wouldBeLoc = LOCATION_CATALOG.some(l =>
      l.name.toLowerCase() === productName.toLowerCase() ||
      l.aliases.some(a => a.toLowerCase() === productName.toLowerCase())
    );
    if (!wouldBeOrg && !wouldBePerson && !wouldBeLoc) {
      add('PRODUCT', productStart, productStart + productName.length, 0.7);
    }
  }

  return resolveOverlaps(matches);
}

// ---------------------------------------------------------------------------
// Entity linking
// ---------------------------------------------------------------------------
function linkEntity(entity, kb) {
  if (!entity || !entity.text) return null;
  const text = entity.text.trim();
  const type = entity.type;

  // 1. Exact match in KB index (case-insensitive, type-aware)
  const exactKey = indexKey(type, text);
  if (kbIndex.has(exactKey) && kb.has(kbIndex.get(exactKey))) {
    const id = kbIndex.get(exactKey);
    const entry = kb.get(id);
    return {
      id,
      canonical: entry.canonical,
      aliases: entry.aliases,
      properties: entry.properties,
      score: 1.0,
      method: 'exact'
    };
  }

  // 2. Also try matching across all types if no type-specific match found
  // (helpful for abbreviations like "Alphabet" -> ORG "Google/Alphabet")
  if (!kbIndex.has(exactKey)) {
    for (const [k, id] of kbIndex.entries()) {
      if (k.endsWith(`:${text.toLowerCase()}`) && kb.has(id)) {
        const entry = kb.get(id);
        return {
          id,
          canonical: entry.canonical,
          aliases: entry.aliases,
          properties: entry.properties,
          score: 0.95,
          method: 'alias'
        };
      }
    }
  }

  // 3. Fuzzy match — scan KB entries of matching type
  let best = null;
  const lowerText = text.toLowerCase();

  for (const entry of kb.values()) {
    // Only fuzzy within type for the same-type case
    if (entry.type !== type) continue;

    const candidates = [entry.canonical, ...(entry.aliases || [])];
    for (const cand of candidates) {
      const candLower = cand.toLowerCase();

      // Levenshtein distance
      const dist = levenshtein(lowerText, candLower);
      const maxLen = Math.max(lowerText.length, candLower.length);
      const sim = maxLen === 0 ? 1 : 1 - (dist / maxLen);

      // Accept if distance <= 2 chars AND similarity >= 0.7
      if (dist <= 2 && sim >= 0.7) {
        if (!best || sim > best.score) {
          best = {
            id: entry.id,
            canonical: entry.canonical,
            aliases: entry.aliases,
            properties: entry.properties,
            score: sim,
            method: 'fuzzy',
            distance: dist
          };
        }
      }
    }
  }

  if (best) return best;

  // 4. Cross-type fuzzy — relax type constraint (very low confidence threshold)
  for (const entry of kb.values()) {
    const candidates = [entry.canonical, ...(entry.aliases || [])];
    for (const cand of candidates) {
      const candLower = cand.toLowerCase();
      const sim = similarity(lowerText, candLower);
      if (sim >= 0.95) {
        return {
          id: entry.id,
          canonical: entry.canonical,
          aliases: entry.aliases,
          properties: entry.properties,
          score: sim,
          method: 'cross-type-fuzzy'
        };
      }
    }
  }

  return null;
}

function linkEntities(entities, kb = kbEntities) {
  if (!Array.isArray(entities)) return [];
  return entities.map(e => {
    const match = linkEntity(e, kb);
    return {
      text: e.text,
      type: e.type,
      match
    };
  });
}

// ---------------------------------------------------------------------------
// Fact extraction — (subject, predicate, object) triples
// ---------------------------------------------------------------------------
const BE_VERBS = /\b(?:is|was|are|were|became|becomes|remain|remains)\b/i;

const ACTION_VERBS = [
  'founded','co-founded','started','launched','created','built','developed','invented','designed',
  'acquired','bought','sold','merged','partnered','invested','led','headed','managed','ran',
  'released','introduced','unveiled','announced','discovered','pioneered','authored','wrote',
  'released','published','opened','closed'
];

const ORIGIN_PATTERNS = [
  // "X was born in Y", "X is from Y", "X is based in Y", "X hails from Y"
  { regex: /^(.+?)\s+(?:was|is|are)\s+(?:born\s+in|from|based\s+in|headquartered\s+in|located\s+in|hails\s+from)\s+(.+?)[.!?]?$/i, predicate: 'origin' },
  // "X lives in Y"
  { regex: /^(.+?)\s+(?:lives|lived)\s+in\s+(.+?)[.!?]?$/i, predicate: 'lives_in' }
];

const EMPLOYMENT_PATTERNS = [
  { regex: /^(.+?)\s+works?\s+(?:at|for|with)\s+(.+?)[.!?]?$/i, predicate: 'works_at' },
  { regex: /^(.+?)\s+(?:is|was)\s+(?:the\s+)?(?:CEO|CTO|CFO|COO|president|founder|co-founder|chairman|director|manager)\s+(?:of|at)\s+(.+?)[.!?]?$/i, predicate: 'role_at' }
];

const NUMERIC_PATTERNS = [
  { regex: /^(.+?)\s+is\s+(\d+)\s+years?\s+old[.!?]?$/i, predicate: 'age' },
  { regex: /^(.+?)\s+has\s+(\d[\d,]*)\s+employees[.!?]?$/i, predicate: 'employee_count' },
  { regex: /^(.+?)\s+has\s+(\d[\d,]*)\s+(?:users|customers|clients)[.!?]?$/i, predicate: 'user_count' },
  { regex: /^(.+?)\s+(?:is\s+)?worth\s+\$?([\d,]+(?:\.\d+)?)\s*(?:billion|million|thousand|[BMK])?[.!?]?$/i, predicate: 'valuation' }
];

const APPOSITIVE_RE = /^([^,]+?),\s+(?:the|a|an)\s+(.+?)[.!?]?$/i;

const COMMA_LIST_RE = /^(.+?),\s*(.+?),\s*and\s+(.+?)[.!?]?$/i;
const COMMA_LIST_RE_2 = /^(.+?)\s+and\s+(.+?)[.!?]?$/i;

function isCapitalized(s) {
  return /^[A-Z]/.test(s.trim());
}

function isLikelyName(s) {
  const t = s.trim();
  // Has at least one capital letter; rejects all-lowercase common nouns
  if (t.length < 2) return false;
  if (/^\d+$/.test(t)) return false;
  // Capitalized words (proper noun) or all-caps acronym
  if (/^[A-Z][a-z]+/.test(t) || /^[A-Z]{2,}/.test(t)) return true;
  // TECH term or product with mixed case
  if (/[A-Z]/.test(t) && /[a-z]/.test(t)) return true;
  return false;
}

function extractFacts(text, options = {}) {
  if (typeof text !== 'string' || !text) return [];

  const minConfidence = typeof options.minConfidence === 'number' ? options.minConfidence : 0.4;
  const maxFacts = Math.min(options.maxFacts || 50, 500);

  const facts = [];
  const sentences = splitSentences(text);

  const addFact = (subject, predicate, object, sentence, confidence, start, end) => {
    if (confidence < minConfidence) return;
    if (facts.length >= maxFacts) return;
    facts.push({ subject: subject.trim(), predicate, object: object.trim(), sentence, confidence, start, end });
  };

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Find sentence position in original text (for span)
    const sentStart = text.indexOf(trimmed);
    const sentEnd = sentStart + trimmed.length;

    let matched = false;

    // 1. Origin patterns (checked first — they include "is" and might otherwise match be-verb)
    for (const pat of ORIGIN_PATTERNS) {
      const m = trimmed.match(pat.regex);
      if (m) {
        addFact(m[1], pat.predicate, m[2], trimmed, 0.85, sentStart, sentEnd);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. Employment patterns
    for (const pat of EMPLOYMENT_PATTERNS) {
      const m = trimmed.match(pat.regex);
      if (m) {
        // For role_at, the predicate carries the role info
        const pred = pat.predicate;
        addFact(m[1], pred, m[2], trimmed, 0.85, sentStart, sentEnd);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 3. Numeric relations
    for (const pat of NUMERIC_PATTERNS) {
      const m = trimmed.match(pat.regex);
      if (m) {
        addFact(m[1], pat.predicate, m[2], trimmed, 0.8, sentStart, sentEnd);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 4. Action verbs (founded/acquired/launched ...)
    for (const verb of ACTION_VERBS) {
      const re = new RegExp(`^(.+?)\\s+${verb}\\s+(.+?)[.!?]?$`, 'i');
      const m = trimmed.match(re);
      if (m) {
        addFact(m[1], verb, m[2], trimmed, 0.75, sentStart, sentEnd);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 5. Appositive — "X, the Y"
    const ap = trimmed.match(APPOSITIVE_RE);
    if (ap) {
      addFact(ap[1], 'is', ap[2], trimmed, 0.7, sentStart, sentEnd);
      matched = true;
    }
    if (matched) continue;

    // 6. Be-verb "X is Y" / "X was Y"
    const bv = trimmed.match(/^(.+?)\s+(?:is|was|are|were|became|becomes)\s+(?:a|an|the)?\s*(.+?)[.!?]?$/i);
    if (bv) {
      const subject = bv[1].trim();
      const object = bv[2].trim();
      // Only emit if subject looks like a name/proper noun
      if (isLikelyName(subject) && object.length > 1) {
        addFact(subject, 'is', object, trimmed, 0.65, sentStart, sentEnd);
        matched = true;
      }
    }
    if (matched) continue;

    // 7. Comma lists — "X, Y, and Z" -> pairwise associations
    const cl3 = trimmed.match(COMMA_LIST_RE);
    if (cl3) {
      const [_, a, b, c] = cl3;
      const items = [a, b, c].map(s => s.trim());
      // Pairwise: a-b, a-c, b-c
      if (isLikelyName(items[0]) && isLikelyName(items[1])) {
        addFact(items[0], 'associated_with', items[1], trimmed, 0.5, sentStart, sentEnd);
      }
      if (isLikelyName(items[0]) && isLikelyName(items[2])) {
        addFact(items[0], 'associated_with', items[2], trimmed, 0.5, sentStart, sentEnd);
      }
      if (isLikelyName(items[1]) && isLikelyName(items[2])) {
        addFact(items[1], 'associated_with', items[2], trimmed, 0.5, sentStart, sentEnd);
      }
      matched = true;
    } else {
      const cl2 = trimmed.match(COMMA_LIST_RE_2);
      if (cl2) {
        const [_, a, b] = cl2;
        const items = [a, b].map(s => s.trim());
        if (isLikelyName(items[0]) && isLikelyName(items[1])) {
          addFact(items[0], 'associated_with', items[1], trimmed, 0.5, sentStart, sentEnd);
          matched = true;
        }
      }
    }
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: SERVICE_VERSION,
    kbEntities: kbEntities.size,
    stats: {
      extractionsRun: stats.extractionsRun,
      entitiesFound: stats.entitiesFound,
      factsExtracted: stats.factsExtracted,
      linksMade: stats.linksMade,
      errors: stats.errors
    },
    uptime: process.uptime(),
    startedAt,
    timestamp: new Date().toISOString()
  });
});

// ---------- NER ----------

app.post('/api/ner/extract',requireAuth,  (req, res) => {
  const startMs = Date.now();
  const { text, types, minConfidence, includeSpans } = req.body || {};
  if (typeof text !== 'string') {
    stats.errors++;
    return res.status(400).json({ error: 'text (string) is required', code: 'INVALID_TEXT' });
  }
  if (!text) {
    return res.json({ entities: [], count: 0, took_ms: Date.now() - startMs });
  }

  const threshold = typeof minConfidence === 'number' ? minConfidence : 0.5;
  const wantSpans = includeSpans !== false;

  try {
    const all = extractEntities(text, { types: Array.isArray(types) ? types : null });
    const filtered = all.filter(e => e.confidence >= threshold);

    const entities = filtered.map(e => {
      const out = { text: e.text, type: e.type, confidence: +e.confidence.toFixed(3) };
      if (wantSpans) {
        out.start = e.start;
        out.end = e.end;
      }
      return out;
    });

    stats.extractionsRun++;
    stats.entitiesFound += entities.length;
    for (const e of entities) bumpType(e.type, 1);

    audit({
      action: 'ner.extract',
      actor: principalOf(req),
      inputLength: text.length,
      outputCount: entities.length,
      types: types || null,
      success: true
    });

    res.json({ entities, count: entities.length, took_ms: Date.now() - startMs });
  } catch (err) {
    stats.errors++;
    audit({ action: 'ner.extract', actor: principalOf(req), success: false, error: err.message });
    res.status(500).json({ error: err.message, code: 'NER_FAILED' });
  }
});

app.get('/api/ner/types', (_req, res) => {
  res.json({
    count: Object.keys(ENTITY_TYPES).length,
    types: Object.entries(ENTITY_TYPES).map(([type, info]) => ({
      type,
      description: info.description,
      example: info.example
    }))
  });
});

// ---------- Entity Linking ----------

app.post('/api/link',requireAuth,  (req, res) => {
  const startMs = Date.now();
  const { entities, knowledgeBase } = req.body || {};
  if (!Array.isArray(entities)) {
    stats.errors++;
    return res.status(400).json({ error: 'entities (array) is required', code: 'INVALID_ENTITIES' });
  }

  // knowledgeBase parameter is accepted for API compatibility — v1 uses a single in-memory KB
  // If a name is provided and doesn't match the default, we still use the default KB.
  // Future: support multiple named KBs.

  try {
    const linked = linkEntities(entities);
    const matched = linked.filter(l => l.match !== null).length;

    stats.extractionsRun++;
    stats.linksMade += matched;
    bumpType('LINK', matched);

    audit({
      action: 'link',
      actor: principalOf(req),
      inputCount: entities.length,
      matched,
      knowledgeBase: knowledgeBase || 'default',
      success: true
    });

    res.json({ linked, count: linked.length, matched, took_ms: Date.now() - startMs });
  } catch (err) {
    stats.errors++;
    audit({ action: 'link', actor: principalOf(req), success: false, error: err.message });
    res.status(500).json({ error: err.message, code: 'LINK_FAILED' });
  }
});

// ---------- KB CRUD ----------

app.post('/api/kb/entities',requireAuth,  (req, res) => {
  const { id, canonical, type, aliases, properties } = req.body || {};
  if (typeof canonical !== 'string' || !canonical.trim()) {
    return res.status(400).json({ error: 'canonical (non-empty string) is required', code: 'INVALID_CANONICAL' });
  }
  if (typeof type !== 'string' || !ENTITY_TYPES[type]) {
    return res.status(400).json({ error: 'type must be a valid entity type', code: 'INVALID_TYPE' });
  }

  const entityId = id || uuidv4();
  if (kbEntities.has(entityId)) {
    return res.status(409).json({ error: 'Entity with this id already exists', code: 'DUPLICATE_ID' });
  }

  const entry = {
    id: entityId,
    canonical: canonical.trim(),
    type,
    aliases: Array.isArray(aliases) ? aliases.map(a => String(a).trim()) : [],
    properties: properties && typeof properties === 'object' ? properties : {},
    createdAt: new Date().toISOString()
  };

  kbEntities.set(entityId, entry);
  addToIndex(entry);

  audit({ action: 'kb.add', actor: principalOf(req), entityId, type, success: true });

  res.status(201).json({ message: 'Entity added', entity: entry });
});

app.get('/api/kb/entities', (req, res) => {
  const { type, search, limit, offset } = req.query;
  let list = Array.from(kbEntities.values());

  if (type) list = list.filter(e => e.type === type);

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(e => {
      if (e.canonical.toLowerCase().includes(q)) return true;
      if ((e.aliases || []).some(a => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  list.sort((a, b) => a.canonical.localeCompare(b.canonical));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 100, 1000);
  const page = list.slice(off, off + lim);

  res.json({
    count: list.length,
    limit: lim,
    offset: off,
    entities: page
  });
});

app.delete('/api/kb/entities/:id',requireAuth,  (req, res) => {
  const entry = kbEntities.get(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
  }
  kbEntities.delete(req.params.id);
  removeFromIndex(entry);
  audit({ action: 'kb.delete', actor: principalOf(req), entityId: req.params.id, success: true });
  res.json({ message: 'Entity deleted', id: req.params.id });
});

app.get('/api/kb/stats', (_req, res) => {
  const byType = {};
  for (const e of kbEntities.values()) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  res.json({
    total: kbEntities.size,
    byType,
    indexSize: kbIndex.size,
    timestamp: new Date().toISOString()
  });
});

// ---------- Fact extraction ----------

app.post('/api/facts/extract',requireAuth,  (req, res) => {
  const startMs = Date.now();
  const { text, minConfidence, maxFacts } = req.body || {};
  if (typeof text !== 'string') {
    stats.errors++;
    return res.status(400).json({ error: 'text (string) is required', code: 'INVALID_TEXT' });
  }
  if (!text) {
    return res.json({ facts: [], count: 0, took_ms: Date.now() - startMs });
  }

  try {
    const facts = extractFacts(text, {
      minConfidence: typeof minConfidence === 'number' ? minConfidence : 0.4,
      maxFacts: typeof maxFacts === 'number' ? maxFacts : 50
    });

    stats.extractionsRun++;
    stats.factsExtracted += facts.length;

    audit({
      action: 'facts.extract',
      actor: principalOf(req),
      inputLength: text.length,
      outputCount: facts.length,
      success: true
    });

    res.json({ facts, count: facts.length, took_ms: Date.now() - startMs });
  } catch (err) {
    stats.errors++;
    audit({ action: 'facts.extract', actor: principalOf(req), success: false, error: err.message });
    res.status(500).json({ error: err.message, code: 'FACTS_FAILED' });
  }
});

// ---------- Combined ----------

app.post('/api/extract-all',requireAuth,  (req, res) => {
  const startMs = Date.now();
  const { text, options } = req.body || {};
  if (typeof text !== 'string') {
    stats.errors++;
    return res.status(400).json({ error: 'text (string) is required', code: 'INVALID_TEXT' });
  }
  if (!text) {
    return res.json({ entities: [], linked: [], facts: [], took_ms: Date.now() - startMs });
  }

  const opts = options || {};
  const nerOpts = opts.ner || {};
  const linkEnabled = opts.link !== false;  // default true
  const factOpts = opts.facts || {};

  try {
    // 1. NER
    const allEntities = extractEntities(text, {
      types: Array.isArray(nerOpts.types) ? nerOpts.types : null
    });
    const minConf = typeof nerOpts.minConfidence === 'number' ? nerOpts.minConfidence : 0.5;
    const filtered = allEntities.filter(e => e.confidence >= minConf);

    const entities = filtered.map(e => ({
      text: e.text,
      type: e.type,
      confidence: +e.confidence.toFixed(3),
      start: e.start,
      end: e.end
    }));

    // 2. Link (optional)
    let linked = [];
    if (linkEnabled) {
      const linkInput = entities.map(e => ({ text: e.text, type: e.type }));
      const linkedRaw = linkEntities(linkInput);
      linked = linkedRaw.map(l => ({
        text: l.text,
        type: l.type,
        match: l.match
      }));
    }

    // 3. Facts
    const facts = extractFacts(text, {
      minConfidence: typeof factOpts.minConfidence === 'number' ? factOpts.minConfidence : 0.4,
      maxFacts: typeof factOpts.maxFacts === 'number' ? factOpts.maxFacts : 50
    });

    stats.extractionsRun++;
    stats.entitiesFound += entities.length;
    stats.factsExtracted += facts.length;
    if (linkEnabled) {
      stats.linksMade += linked.filter(l => l.match !== null).length;
    }
    for (const e of entities) bumpType(e.type, 1);

    audit({
      action: 'extract-all',
      actor: principalOf(req),
      inputLength: text.length,
      entitiesCount: entities.length,
      factsCount: facts.length,
      linkEnabled,
      success: true
    });

    res.json({ entities, linked, facts, took_ms: Date.now() - startMs });
  } catch (err) {
    stats.errors++;
    audit({ action: 'extract-all', actor: principalOf(req), success: false, error: err.message });
    res.status(500).json({ error: err.message, code: 'EXTRACT_ALL_FAILED' });
  }
});

// ---------- Catalog ----------

app.get('/api/catalog/tech', (_req, res) => {
  res.json({
    count: TECH_CATALOG.length,
    terms: TECH_CATALOG
  });
});

app.get('/api/catalog/persons', (_req, res) => {
  res.json({
    count: PERSON_CATALOG.length,
    persons: PERSON_CATALOG
  });
});

app.get('/api/catalog/orgs', (_req, res) => {
  res.json({
    count: ORG_CATALOG.length,
    orgs: ORG_CATALOG
  });
});

app.get('/api/catalog/locations', (_req, res) => {
  res.json({
    count: LOCATION_CATALOG.length,
    locations: LOCATION_CATALOG
  });
});

// ---------- Stats & Audit ----------

app.get('/api/stats', (_req, res) => {
  res.json({
    ...stats,
    kbEntities: kbEntities.size,
    auditEntries: auditLog.length,
    startedAt,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/stats/reset',requireAuth,  (req, res) => {
  stats.extractionsRun = 0;
  stats.entitiesFound = 0;
  stats.factsExtracted = 0;
  stats.linksMade = 0;
  stats.errors = 0;
  stats.byType = {};
  audit({ action: 'stats.reset', actor: principalOf(req), success: true });
  res.json({ message: 'Stats reset', stats });
});

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  res.json({
    count: auditLog.length,
    entries: auditLog.slice(-limit).reverse()
  });
});

// ---------------------------------------------------------------------------
// 404 + error handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    service: SERVICE_NAME,
    availableEndpoints: [
      'GET  /api/health',
      'POST /api/ner/extract',
      'GET  /api/ner/types',
      'POST /api/link',
      'POST /api/kb/entities',
      'GET  /api/kb/entities',
      'DELETE /api/kb/entities/:id',
      'GET  /api/kb/stats',
      'POST /api/facts/extract',
      'POST /api/extract-all',
      'GET  /api/catalog/tech',
      'GET  /api/catalog/persons',
      'GET  /api/catalog/orgs',
      'GET  /api/catalog/locations',
      'GET  /api/stats',
      'POST /api/stats/reset',
      'GET  /api/audit'
    ]
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
seedKB();

if (require.main === module) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
    console.log(`[${SERVICE_NAME}] seeded ${kbEntities.size} KB entities, ${TECH_CATALOG.length} TECH terms, ${PERSON_CATALOG.length} persons, ${ORG_CATALOG.length} orgs, ${LOCATION_CATALOG.length} locations`);
  });
  installGracefulShutdown(server);
}

module.exports = app;
