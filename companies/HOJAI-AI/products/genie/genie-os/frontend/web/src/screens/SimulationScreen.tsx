import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

interface SimulationOutcome {
  financial?: any;
  lifestyle?: any;
  career?: any;
  mental?: any;
  relationship?: any;
  risks?: string[];
  opportunities?: string[];
  recommendation?: string;
}

interface Simulation {
  id: string;
  userId: string;
  title: string;
  scenario: string;
  variables: Record<string, string>;
  outcomes: SimulationOutcome;
  pros: string[];
  cons: string[];
  recommendation: string;
  aiUsed: boolean;
  createdAt: string;
}

interface Template {
  id: string;
  category: string;
  title: string;
  prompt: string;
  variables: string[];
  description: string;
}

interface CompareResult {
  titles: string[];
  matrix: Array<{
    id: string;
    title: string;
    scores: {
      financial: number;
      lifestyle: number;
      career: number;
      risk: number;
      relationship: number;
    };
    winner: boolean;
  }>;
  overallWinner: string | null;
}

type Tab = 'templates' | 'create' | 'compare' | 'history';

export default function SimulationScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scenarios, setScenarios] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [scenarioType, setScenarioType] = useState('move');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison state
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [tpls, scens] = await Promise.allSettled([
        apiGet<{ templates: Template[] }>(`${specialists.simulation}/templates/list`),
        apiGet<{ scenarios: Simulation[] }>(`${specialists.simulation}/scenarios/list/user-001`),
      ]);
      if (tpls.status === 'fulfilled') setTemplates(tpls.value.templates || []);
      if (scens.status === 'fulfilled') setScenarios(scens.value.scenarios || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function pickTemplate(t: Template) {
    setSelectedTemplate(t);
    setTitle(t.prompt.replace(/[{}]/g, '').replace(/What if I /i, ''));
    setScenarioType(t.id.replace('tpl-', ''));
    // Pre-fill vars
    const initial: Record<string, string> = {};
    (t.variables || []).forEach((v) => { initial[v] = ''; });
    setVars(initial);
    setTab('create');
  }

  async function runSimulation() {
    if (title.trim().length < 3) {
      alert('Title must be at least 3 characters');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      await apiPost(`${specialists.simulation}/scenarios/run/user-001`, {
        title: title.trim(),
        scenario: scenarioType,
        variables: vars,
        useAI: true,
      });
      setTitle('');
      setVars({});
      setSelectedTemplate(null);
      await load();
      setTab('history');
    } catch (e: any) {
      setError(e.message || 'Failed to run simulation');
    } finally {
      setGenerating(false);
    }
  }

  async function runCompare() {
    if (pickedIds.length < 2) {
      alert('Pick at least 2 scenarios to compare');
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const res = await apiPost<{ data: CompareResult }>(
        `${specialists.simulation}/scenarios/compare/user-001`,
        { scenarioIds: pickedIds }
      );
      setCompareResult(res.data);
    } catch (e: any) {
      setError(e.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  }

  function togglePick(id: string) {
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🧭 Simulation</h1>
        </div>
        <div className="loading">Loading simulations…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🧭 Simulation</h1>
      </div>

      <div className="muted small" style={{ padding: '0 16px 12px' }}>
        What-if scenarios. Test decisions before you make them.
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className={tab === 'templates' ? 'tab active' : 'tab'} onClick={() => setTab('templates')}>
          Templates
        </button>
        <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')}>
          New
        </button>
        <button className={tab === 'compare' ? 'tab active' : 'tab'} onClick={() => setTab('compare')}>
          Compare
        </button>
        <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
          History ({scenarios.length})
        </button>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {/* === TEMPLATES === */}
      {tab === 'templates' && (
        <>
          <div className="card">
            <div className="card-title">✨ Pick a starting point</div>
            <div className="muted small" style={{ marginBottom: 12 }}>
              7 common life decisions — tap one to customize.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontStyle: 'italic' }}>{t.prompt}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: 'rgba(180,140,255,0.18)',
                      borderRadius: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>{t.category}</span>
                    {(t.variables || []).slice(0, 3).map((v) => (
                      <span key={v} style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 8,
                      }}>{v}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* === CREATE === */}
      {tab === 'create' && (
        <>
          <div className="card">
            <div className="card-title">🧪 Run a new simulation</div>
            <input
              type="text"
              placeholder="Title (e.g. Moving to Dubai)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ marginBottom: 12, width: '100%' }}
            />
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              style={{ marginBottom: 12, width: '100%' }}
            >
              <option value="move">Move (life)</option>
              <option value="job">New job (career)</option>
              <option value="quit">Quit job (career)</option>
              <option value="buy">Buy asset (finance)</option>
              <option value="marriage">Marriage (family)</option>
              <option value="child">Have a child (family)</option>
              <option value="relocate">Relocate (life)</option>
              <option value="default">Other / custom</option>
            </select>
            {selectedTemplate && (selectedTemplate.variables || []).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="muted small" style={{ marginBottom: 8 }}>Fill in the variables:</div>
                {(selectedTemplate.variables || []).map((v) => (
                  <input
                    key={v}
                    type="text"
                    placeholder={v}
                    value={vars[v] || ''}
                    onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                    style={{ marginBottom: 8, width: '100%' }}
                  />
                ))}
              </div>
            )}
            <button
              className="btn btn-block"
              disabled={generating}
              onClick={runSimulation}
              style={{ marginTop: 12 }}
            >
              {generating ? '🔄 Running…' : '🧭 Run Simulation'}
            </button>
          </div>
        </>
      )}

      {/* === COMPARE === */}
      {tab === 'compare' && (
        <>
          <div className="card">
            <div className="card-title">⚖️ Compare scenarios</div>
            <div className="muted small" style={{ marginBottom: 12 }}>
              Pick 2 or 3 of your scenarios to compare side-by-side.
            </div>
            {scenarios.length < 2 ? (
              <div className="empty">Run at least 2 simulations first</div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {scenarios.map((s) => {
                    const isPicked = pickedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => togglePick(s.id)}
                        style={{
                          textAlign: 'left',
                          padding: 12,
                          borderRadius: 10,
                          border: isPicked ? '2px solid rgba(180,140,255,0.7)' : '1px solid rgba(255,255,255,0.12)',
                          background: isPicked ? 'rgba(180,140,255,0.10)' : 'rgba(255,255,255,0.03)',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 600 }}>{s.title}</div>
                          <div style={{ fontSize: 11, opacity: 0.6 }}>{isPicked ? '✓ Picked' : 'tap to pick'}</div>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                          {s.scenario} · {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="muted small" style={{ marginBottom: 8 }}>
                  Selected: {pickedIds.length} / 3
                </div>
                <button
                  className="btn btn-block"
                  disabled={pickedIds.length < 2 || comparing}
                  onClick={runCompare}
                >
                  {comparing ? '⚖️ Comparing…' : `⚖️ Compare ${pickedIds.length} scenarios`}
                </button>
              </>
            )}
          </div>

          {compareResult && (
            <div className="card">
              <div className="card-title">📊 Comparison</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {compareResult.matrix.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: row.winner ? '2px solid rgba(140,255,180,0.7)' : '1px solid rgba(255,255,255,0.12)',
                      background: row.winner ? 'rgba(140,255,180,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>{row.title}</div>
                      {row.winner && <span style={{ fontSize: 11, color: '#aaffaa' }}>🏆 Overall winner</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                      <ScoreBar label="💰 Financial" value={row.scores.financial} />
                      <ScoreBar label="🏡 Lifestyle" value={row.scores.lifestyle} />
                      <ScoreBar label="📈 Career" value={row.scores.career} />
                      <ScoreBar label="⚠️ Risk (low=good)" value={row.scores.risk} inverted />
                      <ScoreBar label="💞 Relationship" value={row.scores.relationship} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* === HISTORY === */}
      {tab === 'history' && (
        scenarios.length === 0 ? (
          <div className="empty">
            No simulations yet. Start with a template above ✨
          </div>
        ) : (
          scenarios.map((s) => (
            <div key={s.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="card-title" style={{ marginBottom: 0 }}>{s.title}</div>
                <span style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  background: 'rgba(180,140,255,0.18)',
                  borderRadius: 8,
                  textTransform: 'uppercase',
                }}>{s.scenario}</span>
              </div>
              <div className="muted small" style={{ marginTop: 4, marginBottom: 8 }}>
                {new Date(s.createdAt).toLocaleString()} {s.aiUsed && '· 🤖 AI'}
              </div>

              {s.pros && s.pros.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>✅ Pros</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {s.pros.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {s.cons && s.cons.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>❌ Cons</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {s.cons.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {s.recommendation && (
                <div style={{
                  marginTop: 8,
                  padding: 10,
                  background: 'rgba(140,200,255,0.08)',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}>
                  💡 <strong>Recommendation:</strong> {s.recommendation}
                </div>
              )}

              {s.outcomes && Object.keys(s.outcomes).length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.7 }}>
                    View detailed outcomes
                  </summary>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    lineHeight: 1.5,
                    padding: 8,
                    marginTop: 6,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 6,
                  }}>
                    {JSON.stringify(s.outcomes, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )
      )}
    </div>
  );
}

function ScoreBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const display = inverted ? Math.max(0, 100 - value) : value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ opacity: 0.7 }}>{Math.round(display)}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, display)}%`,
          background: display > 60 ? 'rgba(140,255,180,0.7)' : display > 40 ? 'rgba(255,220,140,0.7)' : 'rgba(255,140,140,0.7)',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}
