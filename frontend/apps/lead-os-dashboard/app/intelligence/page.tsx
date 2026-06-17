'use client';

import { useState } from 'react';
import { Building2, TrendingUp, Users, DollarSign, Globe, Calendar, ExternalLink, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { leadOS } from '@/lib/api';

interface CompanyReport {
  company: string;
  employees: string;
  revenue: string;
  score: number;
  industry: string;
  founded: string;
  headquarters: string;
  description: string;
  technologies: string[];
  funding: string;
  linkedin: string;
  twitter: string;
  recentNews: string[];
}

export default function IntelligencePage() {
  const [company, setCompany] = useState('');
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(['TechCorp Solutions', 'Global Retail Inc', 'Startup Ventures']);

  const handleResearch = async () => {
    if (!company.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await leadOS.companyReport(company);
      if (data && !data.error) {
        setReport(data);
        if (!searchHistory.includes(company)) {
          setSearchHistory((prev) => [company, ...prev.slice(0, 4)]);
        }
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('An error occurred while generating the report');
    } finally {
      setLoading(false);
    }
  };

  const IntelCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
  }: {
    icon: any;
    title: string;
    value: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Intelligence</h1>
        <p className="text-gray-500 mt-1">Research and analyze companies with AI-powered insights</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Company Research</h2>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter company name (e.g., TechCorp Solutions)..."
              className="input-field pl-10"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
            />
          </div>
          <button
            onClick={handleResearch}
            disabled={loading || !company.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>

        {/* Search History */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-500">Recent:</span>
          {searchHistory.map((term) => (
            <button
              key={term}
              onClick={() => {
                setCompany(term);
                handleResearch();
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <IntelCard icon={Building2} title="Company" value={report.company} />
            <IntelCard icon={Users} title="Employees" value={report.employees} />
            <IntelCard icon={DollarSign} title="Revenue" value={report.revenue} />
            <IntelCard
              icon={TrendingUp}
              title="Lead Score"
              value={report.score.toString()}
              subtitle={report.score >= 80 ? 'High Priority' : report.score >= 60 ? 'Medium Priority' : 'Low Priority'}
            />
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* About */}
            <div className="lg:col-span-2 bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">Company Overview</h3>
              <p className="text-gray-600 mb-6">{report.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Industry</span>
                  <p className="font-medium">{report.industry}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Founded</span>
                  <p className="font-medium">{report.founded}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Headquarters</span>
                  <p className="font-medium">{report.headquarters}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Funding</span>
                  <p className="font-medium">{report.funding}</p>
                </div>
              </div>

              {/* Technologies */}
              <div className="mt-6">
                <span className="text-sm text-gray-500 mb-2 block">Technologies</span>
                <div className="flex flex-wrap gap-2">
                  {report.technologies.map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 pt-6 border-t">
                <span className="text-sm text-gray-500 mb-2 block">Social Presence</span>
                <div className="flex gap-3">
                  {report.linkedin && (
                    <a
                      href={`https://linkedin.com/company/${report.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg text-sm hover:bg-[#006097]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {report.twitter && (
                    <a
                      href={`https://twitter.com/${report.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent News */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">Recent News</h3>
                <div className="space-y-4">
                  {report.recentNews.map((news, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-700">{news}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  <button className="w-full btn-primary justify-center">
                    Add to Leads
                  </button>
                  <button className="w-full btn-secondary justify-center">
                    Create Campaign
                  </button>
                  <button className="w-full btn-secondary justify-center">
                    View Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Company Intelligence at Your Fingertips</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter a company name above to generate a comprehensive report including company size,
            revenue, technologies, funding, and recent news.
          </p>
        </div>
      )}
    </div>
  );
}
