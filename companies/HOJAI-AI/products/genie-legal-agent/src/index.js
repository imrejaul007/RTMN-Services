/**
 * Genie Legal Agent — port 4722.
 *
 * Capabilities: contract-review, clause-extraction, risk-flagging, regulatory-tracking.
 *
 * Endpoints:
 *   GET    /health, /ready, /info
 *   POST   /api/v1/legal/review           — review a contract, flag risks
 *   POST   /api/v1/legal/extract          — extract clauses
 *   POST   /api/v1/legal/regulations/check — check against regulation
 *   POST   /api/v1/legal/draft            — draft an NDA / contract
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = parseInt(process.env.LEGAL_PORT || '4722');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.LEGAL_REQUIRE_AUTH !== 'false';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

function apiResponse(success, data, error) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json(apiResponse(false, undefined, 'Auth required'));
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) return res.status(401).json(apiResponse(false, undefined, 'Invalid key'));
  next();
}

// ─── Risk patterns (keyword-based MVP — production uses NLP) ───────────

const RISKY_PATTERNS = [
  { pattern: /unlimited liability/i, severity: 'critical', label: 'Unlimited liability clause' },
  { pattern: /indemnify.*all.*claims/i, severity: 'high', label: 'Broad indemnification' },
  { pattern: /perpetual.*license/i, severity: 'high', label: 'Perpetual license grant' },
  { pattern: /irrevocable/i, severity: 'medium', label: 'Irrevocable rights' },
  { pattern: /sole discretion/i, severity: 'medium', label: 'Sole discretion clause' },
  { pattern: /non-compete.*worldwide/i, severity: 'high', label: 'Worldwide non-compete' },
  { pattern: /exclusive remedy/i, severity: 'medium', label: 'Exclusive remedy limitation' },
  { pattern: /waive.*jury/i, severity: 'high', label: 'Jury waiver' },
  { pattern: /auto-renew/i, severity: 'medium', label: 'Auto-renewal clause' },
  { pattern: /liquidated damages/i, severity: 'low', label: 'Liquidated damages' },
  { pattern: /assignment.*without consent/i, severity: 'medium', label: 'Assignment without consent' },
  { pattern: /governing law.*Singapore/i, severity: 'info', label: 'Singapore governing law (neutral)' },
  { pattern: /confidentiality/i, severity: 'info', label: 'Confidentiality clause' }
];

const CLAUSE_TYPES = [
  { pattern: /shall not (?:disclose|share|reveal)/i, type: 'confidentiality' },
  { pattern: /indemnif/i, type: 'indemnification' },
  { pattern: /terminat/i, type: 'termination' },
  { pattern: /governing law/i, type: 'governing-law' },
  { pattern: /payment|compensation|fee/i, type: 'payment' },
  { pattern: /intellectual property|copyright|patent/i, type: 'ip' },
  { pattern: /warranty|represent/i, type: 'warranty' },
  { pattern: /limitation of liability/i, type: 'liability-cap' },
  { pattern: /force majeure/i, type: 'force-majeure' },
  { pattern: /assignment/i, type: 'assignment' }
];

const REGULATION_RULES = [
  { jurisdiction: 'EU', name: 'GDPR', check: /personal data|gdpr|right to be forgotten/i },
  { jurisdiction: 'US-CA', name: 'CCPA', check: /personal information|california|opt-out/i },
  { jurisdiction: 'IN', name: 'DPDP', check: /personal data|india.*data.*protection/i },
  { jurisdiction: 'US', name: 'HIPAA', check: /health information|patient|phi/i },
  { jurisdiction: 'GLOBAL', name: 'PCI-DSS', check: /payment card|credit card|pci/i },
  { jurisdiction: 'EU', name: 'AI Act', check: /artificial intelligence|ai system|automated decision/i }
];

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'genie-legal', version: '1.0.0', port: PORT }));
app.get('/ready', (_req, res) => res.json({ ready: true, port: PORT }));

app.get('/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'Genie Legal',
    version: '1.0.0',
    capabilities: ['contract-review', 'clause-extraction', 'risk-flagging', 'regulatory-tracking']
  }));
});

app.post('/api/v1/legal/review', apiKeyAuth, (req, res) => {
  const { contractText, contractType } = req.body || {};
  if (!contractText) return res.status(400).json(apiResponse(false, undefined, 'contractText is required'));

  const risks = detectRisks(contractText);
  const summary = {
    contractType: contractType || 'unknown',
    riskScore: computeRiskScore(risks),
    riskCounts: countBySeverity(risks),
    risks,
    recommendation: getRecommendation(risks),
    humanReviewRequired: risks.some((r) => r.severity === 'critical')
  };
  res.json(apiResponse(true, summary));
});

app.post('/api/v1/legal/extract', apiKeyAuth, (req, res) => {
  const { contractText } = req.body || {};
  if (!contractText) return res.status(400).json(apiResponse(false, undefined, 'contractText is required'));

  const sentences = contractText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  const clauses = sentences.map((sentence) => {
    const type = CLAUSE_TYPES.find((c) => c.pattern.test(sentence));
    return type
      ? { text: sentence, type: type.type, index: sentences.indexOf(sentence) }
      : null;
  }).filter(Boolean);

  res.json(apiResponse(true, {
    sentenceCount: sentences.length,
    clauseCount: clauses.length,
    clauses
  }));
});

app.post('/api/v1/legal/regulations/check', apiKeyAuth, (req, res) => {
  const { documentText, jurisdictions = ['EU', 'US', 'IN'] } = req.body || {};
  if (!documentText) return res.status(400).json(apiResponse(false, undefined, 'documentText is required'));

  const applicableRules = REGULATION_RULES
    .filter((r) => jurisdictions.includes(r.jurisdiction) || jurisdictions.includes('GLOBAL'))
    .map((rule) => ({
      jurisdiction: rule.jurisdiction,
      name: rule.name,
      applicable: rule.check.test(documentText),
      reason: rule.check.test(documentText)
        ? `Document mentions terms relevant to ${rule.name}`
        : `No ${rule.name}-related terms found`
    }));

  res.json(apiResponse(true, {
    documentLength: documentText.length,
    checkedJurisdictions: jurisdictions,
    rules: applicableRules
  }));
});

app.post('/api/v1/legal/draft', apiKeyAuth, (req, res) => {
  const { type = 'nda', partyA, partyB, jurisdiction = 'US', term = '2 years' } = req.body || {};
  if (!partyA || !partyB) {
    return res.status(400).json(apiResponse(false, undefined, 'partyA and partyB required'));
  }
  if (!['nda', 'msa', 'sow'].includes(type)) {
    return res.status(400).json(apiResponse(false, undefined, 'type must be nda, msa, or sow'));
  }
  const doc = draftTemplate(type, { partyA, partyB, jurisdiction, term });
  res.json(apiResponse(true, { type, parties: [partyA, partyB], document: doc }));
});

// ─── Helpers ───────────────────────────────────────────────────────────

function detectRisks(text) {
  const hits = [];
  for (const rule of RISKY_PATTERNS) {
    const matches = text.match(new RegExp(rule.pattern.source, 'gi'));
    if (matches) {
      hits.push({
        severity: rule.severity,
        label: rule.label,
        count: matches.length,
        example: matches[0]
      });
    }
  }
  return hits.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

function severityOrder(s) {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s] ?? 5;
}

function computeRiskScore(risks) {
  let score = 0;
  for (const r of risks) {
    score += { critical: 40, high: 20, medium: 8, low: 2, info: -1 }[r.severity] || 0;
  }
  return Math.max(0, Math.min(100, score));
}

function countBySeverity(risks) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const r of risks) counts[r.severity]++;
  return counts;
}

function getRecommendation(risks) {
  if (risks.some((r) => r.severity === 'critical')) {
    return 'CRITICAL: Human lawyer review required before signing. Do NOT proceed.';
  }
  if (risks.filter((r) => r.severity === 'high').length >= 2) {
    return 'Multiple high-risk clauses. Recommend human lawyer review.';
  }
  if (risks.filter((r) => r.severity === 'high').length >= 1) {
    return 'One high-risk clause found. Consider negotiation before signing.';
  }
  if (risks.some((r) => r.severity === 'medium')) {
    return 'Standard risk profile. Acceptable for most use cases.';
  }
  return 'Low risk. Standard terms.';
}

function draftTemplate(type, { partyA, partyB, jurisdiction, term }) {
  const today = new Date().toISOString().slice(0, 10);
  if (type === 'nda') {
    return `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of ${today} ("Effective Date") by and between ${partyA} ("Party A") and ${partyB} ("Party B").

1. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party, including but not limited to technical, financial, business, or strategic information.

2. OBLIGATIONS
Each party agrees to (a) hold the other party's Confidential Information in strict confidence, (b) not disclose such information to third parties without prior written consent, and (c) use such information solely for the purpose of evaluating a potential business relationship.

3. TERM
This Agreement shall remain in effect for ${term} from the Effective Date.

4. GOVERNING LAW
This Agreement shall be governed by the laws of ${jurisdiction}.

5. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

_________________________      _________________________
${partyA}                                ${partyB}`;
  }
  if (type === 'msa') {
    return `MASTER SERVICES AGREEMENT

This Master Services Agreement is entered into as of ${today} by and between ${partyA} ("Provider") and ${partyB} ("Client").

1. SERVICES
Provider shall provide services as described in Statements of Work (SOWs) executed under this Agreement.

2. PAYMENT TERMS
Client shall pay Provider within 30 days of invoice receipt.

3. INTELLECTUAL PROPERTY
Each party retains ownership of its pre-existing IP. Work product created under SOWs shall be owned by Client upon payment.

4. LIMITATION OF LIABILITY
Provider's liability shall not exceed fees paid in the 12 months preceding the claim.

5. TERM AND TERMINATION
This Agreement is effective for ${term} and may be terminated by either party with 30 days written notice.

6. GOVERNING LAW
This Agreement shall be governed by the laws of ${jurisdiction}.

_________________________      _________________________
${partyA}                                ${partyB}`;
  }
  // sow
  return `STATEMENT OF WORK ${Date.now().toString(36).toUpperCase()}

Between ${partyA} ("Provider") and ${partyB} ("Client")

Effective: ${today}
Term: ${term}

SCOPE:
[Describe specific deliverables and acceptance criteria]

DELIVERABLES:
1. [Deliverable 1]
2. [Deliverable 2]
3. [Deliverable 3]

TIMELINE:
- Start: ${today}
- End: ${term}

FEES:
[Describe fee structure]

ACCEPTANCE:
[Describe acceptance criteria]

GOVERNING LAW: ${jurisdiction}`;
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[genie-legal] listening on :${PORT}`);
    console.log(`[genie-legal] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  });
}

module.exports = { app, detectRisks, computeRiskScore, draftTemplate };