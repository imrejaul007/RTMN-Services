'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  UserPlus,
  TrendingUp,
  Filter,
  Search,
  Plus,
  MoreVertical,
  ChevronRight,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  ArrowRight,
  Bot,
  BarChart3,
  GitPullRequest,
} from 'lucide-react';
import {
  jobsApi,
  candidatesApi,
  pipelineApi,
  aiApi,
  analyticsApi,
} from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// Pipeline stages
const STAGES = ['applied', 'screening', 'technical', 'cultural', 'offer', 'hired'];

const STAGE_COLORS: Record<string, string> = {
  applied: '#6B7280',
  screening: '#3B82F6',
  technical: '#8B5CF6',
  cultural: '#EC4899',
  offer: '#10B981',
  hired: '#059669',
};

// Stage icons
const StageIcon = ({ stage }: { stage: string }) => {
  switch (stage) {
    case 'applied':
      return <UserPlus className="w-4 h-4" />;
    case 'screening':
      return <Filter className="w-4 h-4" />;
    case 'technical':
      return <BarChart3 className="w-4 h-4" />;
    case 'cultural':
      return <Users className="w-4 h-4" />;
    case 'offer':
      return <DollarSign className="w-4 h-4" />;
    case 'hired':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <GitPullRequest className="w-4 h-4" />;
  }
};

export default function TalentAIPage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsData, candidatesData, pipelineData, analyticsData] = await Promise.all([
        jobsApi.list({ status: 'open' }),
        candidatesApi.list({}),
        pipelineApi.getKanban(),
        analyticsApi.getDashboard(),
      ]);

      setJobs(jobsData.data || []);
      setCandidates(candidatesData.data || []);
      setPipeline(pipelineData || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Move candidate
  const moveCandidate = async (candidateId: string, stage: string) => {
    try {
      await candidatesApi.move(candidateId, stage);
      fetchData();
    } catch (error) {
      console.error('Error moving candidate:', error);
    }
  };

  // Score candidate with AI
  const scoreCandidate = async (candidateId: string) => {
    try {
      const result = await candidatesApi.score(candidateId);
      alert(`AI Score: ${result.score}\nMatch: ${result.matchedSkills?.join(', ')}`);
      fetchData();
    } catch (error) {
      console.error('Error scoring candidate:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">TalentAI</h1>
                  <p className="text-xs text-gray-500">RTMN Recruitment OS</p>
                </div>
              </div>

              {/* Tabs */}
              <nav className="flex items-center gap-1 ml-8">
                {[
                  { id: 'pipeline', label: 'Pipeline', icon: GitPullRequest },
                  { id: 'jobs', label: 'Jobs', icon: Briefcase },
                  { id: 'candidates', label: 'Candidates', icon: Users },
                  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Post Job
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {/* Pipeline View */}
        {activeTab === 'pipeline' && (
          <PipelineView
            pipeline={pipeline}
            jobs={jobs}
            selectedJob={selectedJob}
            setSelectedJob={setSelectedJob}
            onMove={moveCandidate}
            onScore={scoreCandidate}
          />
        )}

        {/* Jobs View */}
        {activeTab === 'jobs' && (
          <JobsView jobs={jobs} onPublish={async (id) => {
            await jobsApi.publish(id);
            fetchData();
          }} />
        )}

        {/* Candidates View */}
        {activeTab === 'candidates' && (
          <CandidatesView
            candidates={candidates}
            jobs={jobs}
            onMove={moveCandidate}
            onScore={scoreCandidate}
          />
        )}

        {/* Analytics View */}
        {activeTab === 'analytics' && (
          <AnalyticsView analytics={analytics} />
        )}
      </main>
    </div>
  );
}

// ============================================================
// PIPELINE VIEW
// ============================================================

function PipelineView({
  pipeline,
  jobs,
  selectedJob,
  setSelectedJob,
  onMove,
  onScore,
}: {
  pipeline: any[];
  jobs: any[];
  selectedJob: string | null;
  setSelectedJob: (id: string | null) => void;
  onMove: (id: string, stage: string) => void;
  onScore: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recruitment Pipeline</h2>
          <p className="text-gray-500 mt-1">Track candidates through your hiring process</p>
        </div>

        {/* Job Filter */}
        <select
          value={selectedJob || ''}
          onChange={(e) => setSelectedJob(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageData = pipeline.find((p) => p.stage === stage);
          const candidates = stageData?.candidates || [];

          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 bg-gray-100 rounded-xl p-4"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: STAGE_COLORS[stage] + '20', color: STAGE_COLORS[stage] }}
                  >
                    <StageIcon stage={stage} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{stage}</h3>
                    <p className="text-xs text-gray-500">{candidates.length} candidates</p>
                  </div>
                </div>
              </div>

              {/* Candidates */}
              <div className="space-y-3">
                {candidates.map((candidate: any) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    stage={stage}
                    onMove={onMove}
                    onScore={onScore}
                    stages={STAGES}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CANDIDATE CARD
// ============================================================

function CandidateCard({
  candidate,
  stage,
  onMove,
  onScore,
  stages,
}: {
  candidate: any;
  stage: string;
  onMove: (id: string, stage: string) => void;
  onScore: (id: string) => void;
  stages: string[];
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {candidate.firstName?.[0]}{candidate.lastName?.[0]}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {candidate.firstName} {candidate.lastName}
            </h4>
            <p className="text-xs text-gray-500">{candidate.currentTitle}</p>
          </div>
        </div>

        {/* Score Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          candidate.score >= 80 ? 'bg-green-100 text-green-700' :
          candidate.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {candidate.score || 50}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          <span>{candidate.currentCompany}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{candidate.experience} years exp</span>
        </div>
        {candidate.source && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="capitalize">{candidate.source}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onScore(candidate.id)}
          className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-sm font-medium flex items-center justify-center gap-1"
        >
          <Bot className="w-4 h-4" />
          AI Score
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              {stages.filter(s => s !== stage).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onMove(candidate.id, s);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 capitalize"
                >
                  Move to {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JOBS VIEW
// ============================================================

function JobsView({ jobs, onPublish }: { jobs: any[]; onPublish: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Open Positions</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Job
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-500">{job.department}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                job.priority === 'critical' ? 'bg-red-100 text-red-700' :
                job.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {job.priority}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{job.applicationCount || 0}</p>
                <p className="text-xs text-gray-500">Applications</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{job.location}</p>
                <p className="text-xs text-gray-500">Location</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(job.salaryMin / 100000).toFixed(0)}L
                </p>
                <p className="text-xs text-gray-500">Salary Range</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {job.skills?.slice(0, 4).map((skill: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {skill}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onPublish(job.id)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Publish
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CANDIDATES VIEW
// ============================================================

function CandidatesView({
  candidates,
  jobs,
  onMove,
  onScore,
}: {
  candidates: any[];
  jobs: any[];
  onMove: (id: string, stage: string) => void;
  onScore: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">All Candidates</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidates..."
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Candidate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</p>
                      <p className="text-sm text-gray-500">{candidate.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {jobs.find(j => j.id === candidate.jobId)?.title || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-50">
                      <span className="font-semibold text-blue-600">{candidate.score || 50}</span>
                    </div>
                    <button
                      onClick={() => onScore(candidate.id)}
                      className="p-1 hover:bg-purple-100 rounded"
                    >
                      <Bot className="w-4 h-4 text-purple-600" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: (STAGE_COLORS[candidate.stage] || '#6B7280') + '20',
                      color: STAGE_COLORS[candidate.stage] || '#6B7280',
                    }}
                  >
                    {candidate.stage}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">{candidate.source || 'Direct'}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS VIEW
// ============================================================

function AnalyticsView({ analytics }: { analytics: any }) {
  if (!analytics) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  }

  const overview = analytics.overview || {};
  const sourceData = analytics.sourceEffectiveness || [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Recruitment Analytics</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Open Positions" value={overview.openPositions || 0} color="blue" />
        <StatCard label="Total Candidates" value={overview.totalCandidates || 0} color="purple" />
        <StatCard label="In Pipeline" value={overview.inPipeline || 0} color="orange" />
        <StatCard label="Avg. Time to Hire" value={`${overview.averageTimeToHire || 0} days`} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Source Effectiveness */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Source Effectiveness</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversionRate" fill="#3B82F6" name="Conversion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Hiring Funnel</h3>
          <div className="space-y-4">
            {['applied', 'screening', 'technical', 'cultural', 'offer', 'hired'].map((stage, i) => (
              <div key={stage} className="flex items-center gap-4">
                <span className="w-24 text-sm text-gray-600 capitalize">{stage}</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg"
                    style={{
                      width: `${Math.max(100 - i * 15, 10)}%`,
                      backgroundColor: STAGE_COLORS[stage],
                    }}
                  />
                </div>
                <span className="w-12 text-sm font-medium text-gray-900 text-right">
                  {Math.max(100 - i * 15, 5)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
