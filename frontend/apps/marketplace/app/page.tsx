'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Workflow,
  BookOpen,
  TrendingUp,
  Star,
  Download,
  ArrowRight,
  Zap,
  Shield,
  Users,
} from 'lucide-react';
import { getWorkflows, getKnowledgePacks, getIndustries } from '@/lib/api';
import type { Workflow, KnowledgePack } from '@/lib/types';
import WorkflowCard from '@/components/WorkflowCard';
import KnowledgeCard from '@/components/KnowledgeCard';

export default function MarketplaceHome() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [knowledgePacks, setKnowledgePacks] = useState<KnowledgePack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [wf, kb] = await Promise.all([
          getWorkflows({ sortBy: 'popular' }),
          getKnowledgePacks({ sortBy: 'popular' }),
        ]);
        setWorkflows(wf.slice(0, 4));
        setKnowledgePacks(kb.slice(0, 4));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = [
    { label: 'Workflows', value: '500+', icon: Workflow, color: 'text-primary' },
    { label: 'Knowledge Packs', value: '300+', icon: BookOpen, color: 'text-secondary' },
    { label: 'Active Users', value: '10K+', icon: Users, color: 'text-green-500' },
    { label: 'Avg Rating', value: '4.8', icon: Star, color: 'text-yellow-500' },
  ];

  const features = [
    {
      title: 'One-Click Install',
      description: 'Install workflows and knowledge packs instantly with a single click.',
      icon: Zap,
    },
    {
      title: 'Industry Specific',
      description: 'Find solutions tailored for your specific industry vertical.',
      icon: Shield,
    },
    {
      title: 'Trusted Publishers',
      description: 'All content from verified, trusted sources in the RTMN ecosystem.',
      icon: Users,
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Workflow & Knowledge Marketplace
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Browse and install powerful workflows, knowledge packs, and automation tools
              for your industry. Built by experts, powered by RTMN.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/workflows"
                className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Workflow className="w-5 h-5" />
                Browse Workflows
              </Link>
              <Link
                href="/knowledge"
                className="w-full sm:w-auto px-6 py-3 bg-white border text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Browse Knowledge
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                </div>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Why Choose RTMN Marketplace?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl p-6 border text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Workflows */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Popular Workflows</h2>
              <p className="text-gray-600 mt-1">Most installed automation workflows</p>
            </div>
            <Link
              href="/workflows"
              className="flex items-center gap-1 text-primary font-medium hover:underline"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Popular Knowledge Packs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Popular Knowledge Packs</h2>
              <p className="text-gray-600 mt-1">Most downloaded guides and templates</p>
            </div>
            <Link
              href="/knowledge"
              className="flex items-center gap-1 text-secondary font-medium hover:underline"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {knowledgePacks.map((knowledge) => (
                <KnowledgeCard key={knowledge.id} knowledge={knowledge} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Automate Your Business?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using RTMN Marketplace to streamline their operations.
          </p>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
