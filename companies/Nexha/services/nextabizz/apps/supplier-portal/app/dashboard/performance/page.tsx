'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ScoreBreakdown {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
  description: string;
}

interface ScoreHistory {
  month: string;
  score: number;
}

const mockScoreData = {
  overallScore: 4.2,
  creditBoost: 0.5,
  tier: 'Gold',
  tierColor: 'yellow',
  breakdown: [
    {
      label: 'On-Time Delivery',
      value: 95,
      maxValue: 100,
      unit: '%',
      description: 'Percentage of orders delivered on or before promised date',
    },
    {
      label: 'Quality (Low Rejection)',
      value: 98,
      maxValue: 100,
      unit: '%',
      description: 'Percentage of deliveries without quality complaints',
    },
    {
      label: 'Price Consistency',
      value: 88,
      maxValue: 100,
      unit: '%',
      description: 'Consistency in maintaining quoted prices',
    },
    {
      label: 'Response Rate',
      value: 100,
      maxValue: 100,
      unit: '%',
      description: 'RFQ response rate within 24 hours',
    },
    {
      label: 'Lead Time',
      value: 85,
      maxValue: 100,
      unit: '%',
      description: 'Average lead time vs industry standard',
    },
  ] as ScoreBreakdown[],
  history: [
    { month: 'Aug', score: 3.8 },
    { month: 'Sep', score: 3.9 },
    { month: 'Oct', score: 4.0 },
    { month: 'Nov', score: 4.1 },
    { month: 'Dec', score: 4.1 },
    { month: 'Jan', score: 4.2 },
  ] as ScoreHistory[],
  improvementTips: [
    'Maintain consistent pricing across all orders to improve Price Consistency score',
    'Consider reducing lead times by optimizing your supply chain',
    'Respond to RFQs within 12 hours to boost your Response Rate',
    'Implement quality checks before dispatch to reduce rejection rates',
  ],
};

const tierRanges = [
  { name: 'Platinum', min: 4.5, color: 'bg-gray-900 text-white', description: 'Top performers with exceptional service' },
  { name: 'Gold', min: 3.5, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', description: 'Reliable suppliers with good performance' },
  { name: 'Silver', min: 2.0, color: 'bg-gray-100 text-gray-700 border-gray-300', description: 'Meeting basic quality standards' },
  { name: 'Bronze', min: 0, color: 'bg-orange-100 text-orange-800 border-orange-300', description: 'New or developing suppliers' },
];

export default function PerformancePage() {
  const scoreData = mockScoreData;
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly'>('monthly');

  const getTierBadge = (score: number) => {
    const tier = tierRanges.find(t => score >= t.min);
    return tier || tierRanges[tierRanges.length - 1];
  };

  const getScoreColor = (value: number, maxValue: number) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const tier = getTierBadge(scoreData.overallScore);
  const maxScore = scoreData.history.reduce((max, h) => Math.max(max, h.score), 0);
  const minScore = scoreData.history.reduce((min, h) => Math.min(min, h.score), 0);
  const scoreChange = scoreData.history.length >= 2
    ? (scoreData.history[scoreData.history.length - 1].score - scoreData.history[scoreData.history.length - 2].score).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">NextaBizz</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">FS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Orders
            </Link>
            <Link href="/dashboard/products" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Products
            </Link>
            <Link href="/dashboard/rfqs" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              RFQs
            </Link>
            <Link href="/dashboard/performance" className="border-b-2 border-purple-600 text-purple-600 py-4 px-1 text-sm font-medium">
              Performance
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Track your supplier score and performance metrics</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedPeriod === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPeriod('quarterly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedPeriod === 'quarterly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Display */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center space-x-6">
                {/* Score Circle */}
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(scoreData.overallScore / 5) * 352} 352`}
                      className="text-purple-600 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{scoreData.overallScore.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">out of 5.0</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${tier.color}`}>
                      {tier.name} Tier
                    </span>
                    {parseFloat(scoreChange) > 0 && (
                      <span className="flex items-center text-sm font-medium text-green-600">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        +{scoreChange}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Score range: {minScore.toFixed(1)} - {maxScore.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Credit Boost */}
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Credit Boost</p>
                    <p className="text-lg font-bold text-green-600">+{scoreData.creditBoost.toFixed(1)} points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Guide */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Supplier Tiers</h3>
            <div className="space-y-3">
              {tierRanges.map((t) => (
                <div
                  key={t.name}
                  className={`p-3 rounded-lg border-2 ${
                    t.name === tier.name
                      ? `${t.color} border-current`
                      : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-sm text-gray-500">{t.min === 0 ? '<2.0' : `>=${t.min}`}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Metrics Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Score Breakdown</h3>
            <div className="space-y-6">
              {scoreData.breakdown.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                      <p className="text-xs text-gray-500">{metric.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        {metric.value}
                      </span>
                      <span className="text-sm text-gray-500">/{metric.maxValue}{metric.unit}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(metric.value, metric.maxValue)}`}
                      style={{ width: `${(metric.value / metric.maxValue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Score Trend</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {scoreData.history.map((item, index) => {
                const height = (item.score / 5) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative group">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          index === scoreData.history.length - 1
                            ? 'bg-purple-600'
                            : 'bg-purple-300'
                        }`}
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {item.score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <span className="mt-2 text-xs text-gray-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">Period: </span>
                <span className="font-medium text-gray-900">Aug 2023 - Jan 2024</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="flex items-center text-green-600">
                  <span className="w-3 h-3 bg-purple-600 rounded mr-1"></span>
                  Current
                </span>
                <span className="flex items-center text-gray-500">
                  <span className="w-3 h-3 bg-purple-300 rounded mr-1"></span>
                  Previous
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Improvement Tips */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Improvement Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoreData.improvementTips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="p-1 bg-purple-100 rounded mt-0.5">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Factors Explained */}
        <div className="mt-8 bg-purple-50 rounded-xl border border-purple-200 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">How Your Score is Calculated</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">30%</div>
              <div className="text-sm text-gray-600 mt-1">On-Time Delivery</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">25%</div>
              <div className="text-sm text-gray-600 mt-1">Quality</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">20%</div>
              <div className="text-sm text-gray-600 mt-1">Response Rate</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">15%</div>
              <div className="text-sm text-gray-600 mt-1">Price Consistency</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">10%</div>
              <div className="text-sm text-gray-600 mt-1">Lead Time</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-purple-800">
            Your overall score is calculated as a weighted average of these five factors. Credit boost (up to +1.0 points) is awarded for exceptional performance in any category.
          </p>
        </div>
      </main>
    </div>
  );
}
