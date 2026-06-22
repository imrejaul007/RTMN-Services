/**
 * BOA Dashboard - Executive Intelligence Interface
 * RTMN Business Operating Agent
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, BarChart3, Brain, Zap } from 'lucide-react';

// Types
interface BOAResponse {
  question: string;
  summary: string;
  analysis: {
    content: string;
    usage: any;
  };
  data: any;
  recommendations: Array<{
    action: string;
    priority: string;
    description: string;
  }>;
  confidence: number;
  sources: string[];
  responseTime: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: BOAResponse;
}

// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002';

// Industry options
const INDUSTRIES = [
  { value: 'retail', label: 'Retail' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'travel', label: 'Travel' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'automotive', label: 'Automotive' },
];

// Sample questions for quick actions
const SAMPLE_QUESTIONS = [
  { label: 'Why did revenue drop this week?', industry: 'retail' },
  { label: 'What inventory needs reordering?', industry: 'retail' },
  { label: 'Show me top performing products', industry: 'retail' },
  { label: 'Predict demand for next week', industry: 'retail' },
  { label: 'Analyze customer churn risk', industry: 'retail' },
  { label: 'What are my compliance deadlines?', industry: 'legal' },
  { label: 'Show staff scheduling recommendations', industry: 'restaurant' },
  { label: 'Analyze supply chain risks', industry: 'manufacturing' },
];

export default function BOADashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [industry, setIndustry] = useState('retail');
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to **BOA** - Business Operating Agent

I'm your executive intelligence assistant. I can analyze data across your entire RTMN ecosystem to answer complex business questions.

**Example questions you can ask:**
- "Why did revenue drop this week?"
- "What inventory needs reordering?"
- "Predict demand for next month"
- "Analyze customer churn risk"
- "What are my compliance deadlines?"

Select an industry and ask your question to get started.`,
      timestamp: new Date()
    }]);
  }, []);

  // Send query to BOA
  const sendQuery = async (query: string) => {
    if (!query.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setConfidence(null);
    setSources([]);
    setResponseTime(null);

    try {
      const response = await fetch(`${API_BASE}/boa/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          industry,
          context: { userId: 'boa-dashboard-user' }
        })
      });

      if (!response.ok) {
        throw new Error('Query failed');
      }

      const data: BOAResponse = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.summary || data.analysis?.content || 'Analysis complete.',
        timestamp: new Date(),
        data
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConfidence(data.confidence);
      setSources(data.sources || []);
      setResponseTime(data.responseTime);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error processing your query. This could be because:

1. The Business Copilot service is not running
2. Connected services (TwinOS Hub, Genie Memory, Nexha Intelligence) are unavailable
3. Network connectivity issues

Please try again or check that all RTMN services are running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  // Quick action click
  const handleQuickAction = (question: string, ind: string) => {
    setIndustry(ind);
    sendQuery(question);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="hidden xs:block">
                  <h1 className="text-lg sm:text-xl font-bold text-white">BOA</h1>
                  <p className="text-xs text-slate-400">Business Operating Agent</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-300">Executive Intelligence</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[100px] sm:max-w-none"
              >
                {INDUSTRIES.map(ind => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Chat Area - Full width on mobile */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                          : 'bg-slate-700/50 text-slate-100 border border-slate-600/30'
                      }`}
                    >
                      <div className="prose prose-sm prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                      </div>
                      {message.data && (
                        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-600/30 space-y-2 sm:space-y-3">
                          {/* Confidence */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Confidence:</span>
                            <div className="flex-1 h-2 bg-slate-600/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (message.data.confidence || 0) > 0.7
                                    ? 'bg-green-500'
                                    : (message.data.confidence || 0) > 0.4
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${(message.data.confidence || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300">
                              {Math.round((message.data.confidence || 0) * 100)}%
                            </span>
                          </div>

                          {/* Recommendations */}
                          {message.data.recommendations?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                                Recommendations
                              </h4>
                              <div className="space-y-2">
                                {message.data.recommendations.map((rec, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50"
                                  >
                                    <div className={`mt-0.5 flex-shrink-0 ${
                                      rec.priority === 'high' ? 'text-red-400' :
                                      rec.priority === 'medium' ? 'text-yellow-400' :
                                      'text-green-400'
                                    }`}>
                                      {rec.priority === 'high' ? (
                                        <AlertCircle className="w-4 h-4" />
                                      ) : (
                                        <CheckCircle className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs sm:text-sm text-slate-200">{rec.action}</p>
                                      <p className="text-xs text-slate-400 hidden sm:block">{rec.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Analysis Details */}
                          {message.data.analysis?.content && (
                            <details className="mt-3">
                              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                                View detailed analysis
                              </summary>
                              <div className="mt-2 p-3 rounded-lg bg-slate-800/50 text-xs sm:text-sm text-slate-300 whitespace-pre-wrap">
                                {message.data.analysis.content}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700/50 rounded-2xl px-4 py-3 border border-slate-600/30">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        <span className="text-slate-300 text-sm">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 sm:p-4 border-t border-slate-700/50">
                <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask BOA..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl px-4 sm:px-6 py-2 sm:py-3 font-medium transition-all flex items-center justify-center gap-2 flex-shrink-0 min-w-[50px] sm:min-w-[80px]"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Ask</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden lg:block space-y-4 sm:space-y-6">
            {/* Status Panel */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Connection Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">TwinOS Hub</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400">Connected</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Genie Memory</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400">Connected</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Nexha Intel</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400">Connected</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">LLM Service</span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400">Active</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {SAMPLE_QUESTIONS.slice(0, 6).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(q.label, q.industry)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-sm text-slate-300 transition-colors"
                    disabled={isLoading}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics */}
            {sources.length > 0 && (
              <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Last Response</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Confidence</span>
                    <span className="text-sm text-white font-medium">
                      {confidence ? Math.round(confidence * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Response Time</span>
                    <span className="text-sm text-white font-medium">
                      {responseTime ? `${responseTime}ms` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400">Sources</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sources.map((source, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
