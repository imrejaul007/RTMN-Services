import React, { useState, useEffect } from 'react';
import { api, AgentSession, TraceEvent, ToolCall } from '../api/inspector';
import {
  ArrowLeft,
  Clock,
  Cpu,
  Database,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Box,
  Workflow,
  Activity
} from 'lucide-react';

interface Props {
  sessionId: string;
  onBack: () => void;
}

export const SessionInspector: React.FC<Props> = ({ sessionId, onBack }) => {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trace' | 'tools' | 'memory' | 'input'>('trace');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.getSession(sessionId),
        api.getTrace(sessionId)
      ]);
      setSession(s);
      setTrace(t.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{session.agentName}</h2>
          <p className="text-gray-500 text-sm">{session.id}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Metrics Bar */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-around">
        <Metric label="Latency" value={`${session.metrics.latency}ms`} icon={<Clock className="w-4 h-4" />} />
        <Metric label="Tokens" value={session.tokens.total} icon={<Cpu className="w-4 h-4" />} />
        <Metric label="Steps" value={session.metrics.steps} icon={<Workflow className="w-4 h-4" />} />
        <Metric label="Cost" value={`$${session.metrics.cost.toFixed(4)}`} icon={<Activity className="w-4 h-4" />} />
        <Metric label="Errors" value={session.errors.length} icon={<AlertCircle className="w-4 h-4" />} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex border-b">
          {[
            { id: 'trace', label: 'Execution Trace', icon: <Activity className="w-4 h-4" /> },
            { id: 'tools', label: 'Tool Calls', icon: <Box className="w-4 h-4" /> },
            { id: 'memory', label: 'Memory', icon: <Database className="w-4 h-4" /> },
            { id: 'input', label: 'Input/Output', icon: <MessageSquare className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'trace' && <TraceView trace={trace} />}
          {activeTab === 'tools' && <ToolsView tools={session.tools} />}
          {activeTab === 'memory' && <MemoryView memory={session.memory} />}
          {activeTab === 'input' && <InputOutputView input={session.input} output={session.output} />}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: AgentSession['status'] }> = ({ status }) => {
  const config = {
    running: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
    error: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> }
  };
  const { bg, text, icon } = config[status];
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bg} ${text} flex items-center gap-1.5`}>
      {icon}
      {status}
    </span>
  );
};

const Metric: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">{icon}</div>
    <div className="text-xl font-bold">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

const TraceView: React.FC<{ trace: TraceEvent[] }> = ({ trace }) => (
  <div className="space-y-2">
    {trace.map((event, i) => (
      <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
          {i + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {event.type.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded overflow-x-auto">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
      </div>
    ))}
  </div>
);

const ToolsView: React.FC<{ tools: ToolCall[] }> = ({ tools }) => (
  <div className="space-y-3">
    {tools.map(tool => (
      <div key={tool.id} className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ToolStatusIcon status={tool.status} />
            <span className="font-medium">{tool.name}</span>
          </div>
          <span className="text-sm text-gray-500">{tool.duration}ms</span>
        </div>
        {tool.error && (
          <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {tool.error}
          </div>
        )}
        {tool.input && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Input:</div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
        )}
      </div>
    ))}
  </div>
);

const ToolStatusIcon: React.FC<{ status: ToolCall['status'] }> = ({ status }) => {
  const icons = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    running: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    success: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />
  };
  return icons[status];
};

const MemoryView: React.FC<{ memory: AgentSession['memory'] }> = ({ memory }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <MemoryCard label="Working Memory" value={memory.working} max={100} color="blue" />
      <MemoryCard label="Long-term Memory" value={memory.longTerm} max={1000} color="purple" />
      <MemoryCard label="Context Window" value={memory.context} max={50} color="green" />
      <MemoryCard label="Accessed" value={memory.accessed} max={100} color="yellow" />
    </div>
    <div className="p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Memory Confidence</span>
        <span className="text-blue-600">{(memory.confidence * 100).toFixed(1)}%</span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${memory.confidence * 100}%` }}
        />
      </div>
    </div>
  </div>
);

const MemoryCard: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => {
  const percent = (value / max) * 100;
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  };
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
        <div className={`${colors[color]} h-1.5 rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const InputOutputView: React.FC<{
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}> = ({ input, output }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <h4 className="font-medium mb-2 text-blue-600">Input</h4>
      <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
    <div>
      <h4 className="font-medium mb-2 text-green-600">Output</h4>
      <pre className="text-sm bg-green-50 p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  </div>
);

export default SessionInspector;
