'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Maximize2, Grid3X3, Home,
  Zap, Brain, Users, BarChart3, Globe, Building2,
  TrendingUp, Target, Award, Rocket, Shield, Clock,
  Star, Sparkles, Layers, Cpu, Network, Database
} from 'lucide-react';

// Types
type ContentType = {
  subtitle?: string;
  stats?: Array<{ value: string; label: string }>;
  features?: Array<{ title: string; description: string; icon: string }>;
  points?: string[];
  companies?: Array<{ name: string; description: string }>;
  layers?: Array<{ name: string; services: string }>;
  shift?: { title: string; description: string };
  threeShifts?: Array<{ title: string; description: string }>;
  problem?: string;
  solution?: string;
  team?: string[];
  metrics?: Array<{ metric: string; value: string }>;
  timeline?: Array<{ phase: string; items: string[] }>;
  revenue?: string;
  margin?: string;
  tpv?: string;
  opportunity?: string;
  valuation?: string;
  deal?: string;
  contact?: string;
  email?: string;
  tagline?: string;
};

type Slide = {
  id: number;
  type: string;
  title: string;
  content: ContentType;
};

const slides: Slide[] = [
  { id: 1, type: 'cover', title: 'HOJAI AI', content: { subtitle: 'The Autonomous AI Operating System for 24 Industries', tagline: 'AI-Native • Multi-Tenant • Self-Healing' } },
  { id: 2, type: 'problem', title: 'The $4.3T Problem', content: { problem: 'Legacy SaaS is broken for industries with complex operations. Multi-location businesses waste $127B annually on disconnected tools, manual processes, and siloed data.', stats: [{ value: '4.3T', label: 'Annual industry software waste' }, { value: '73%', label: 'Of industry software projects fail' }, { value: '127B', label: 'Lost to disconnected tools' }] } },
  { id: 3, type: 'solution', title: 'One OS. Every Industry.', content: { solution: 'HOJAI AI is the first AI-native operating system that learns your industry, adapts to your operations, and autonomously optimizes everything—built on the RTMN infrastructure.' } },
  { id: 4, type: 'platform', title: '15-Layer AI Platform', content: { layers: [{ name: 'Intelligence', services: 'Genie, CoPilot, Agents, SUTAR' }, { name: 'Customer Growth', services: 'CRM, Ads, Loyalty' }, { name: 'Commerce', services: 'Procurement, POS, Orders' }, { name: 'Financial', services: 'Wallet, Banking, Lending' }, { name: 'Workforce', services: 'HR, Payroll, LMS' }, { name: 'Legal & Trust', services: 'Contracts, Compliance' }, { name: 'Property', services: 'Property, PMS' }, { name: 'Health', services: 'Health, Wellness' }, { name: 'Mobility', services: 'Delivery, Fleet' }, { name: 'Identity', services: 'Universal Identity' }, { name: 'Memory', services: 'Business Memory' }, { name: 'Twins', services: 'Digital Twins' }, { name: 'Automation', services: 'Workflows' }, { name: 'Autonomous', services: 'Goals, Karma' }, { name: 'Network', services: 'Customers, Referrals' }] } },
  { id: 5, type: 'industries', title: '24 Industry Operating Systems', content: { features: [{ title: 'Hospitality OS', description: 'Hotels, Restaurants, Bars, Cafes, Clubs', icon: 'building' }, { title: 'Healthcare OS', description: 'Clinics, Hospitals, Labs, Pharmacies', icon: 'heart' }, { title: 'Retail OS', description: 'Stores, E-commerce, Wholesale, Distribution', icon: 'shopping-bag' }, { title: 'Legal OS', description: 'Law Firms, Corporate Legal, Compliance', icon: 'scale' }] } },
  { id: 6, type: 'industries2', title: 'Growing Fast', content: { features: [{ title: 'Education OS', description: 'Schools, Training, EdTech', icon: 'book' }, { title: 'Automotive OS', description: 'Dealerships, Service Centers', icon: 'car' }, { title: 'Fitness OS', description: 'Gyms, Studios, Wellness', icon: 'dumbbell' }, { title: 'Manufacturing OS', description: 'Production, Quality, Supply Chain', icon: 'factory' }] } },
  { id: 7, type: 'threeShifts', title: 'The Three Shifts', content: { threeShifts: [{ title: 'AI-Native', description: 'Every workflow designed around AI from day one. Not bolted-on features, but fundamental architecture.' }, { title: 'Multi-Tenant', description: 'One platform, infinite instances. Industry-specific AI models that share learning across the network.' }, { title: 'Self-Healing', description: 'Autonomous error correction, predictive maintenance, and self-optimizing processes.' }] } },
  { id: 8, type: 'products', title: '190+ AI Products', content: { points: ['Foundation Services: CorpID, MemoryOS, GoalOS, Decision Engine', 'Digital Twins: Agent, Property, Referral, Buyer, Deal, Area', 'Industry OS: Restaurant, Hotel, Healthcare, Retail, Legal', 'AI Agents: Business CoPilot, Genie, SUTAR OS', 'Integration Hub: Service Registry, Event Bus, GraphQL'] } },
  { id: 9, type: 'products2', title: 'Core Products', content: { features: [{ title: 'SUTAR OS', description: 'Autonomous business operations. Set goals, AI executes.', icon: 'target' }, { title: 'Business Copilot', description: 'AI-powered decision making for every business function.', icon: 'brain' }, { title: 'Digital Twins', description: 'Virtual replicas of customers, properties, and operations.', icon: 'copy' }] } },
  { id: 10, type: 'market', title: '$890B Market Opportunity', content: { opportunity: 'The global enterprise software market will reach $890B by 2028. AI-native platforms are capturing 40% of new deals. HOJAI is positioned to own the mid-market across 24 verticals.' } },
  { id: 11, type: 'traction', title: 'Traction & Momentum', content: { stats: [{ value: '24', label: 'Industry OS deployed' }, { value: '190+', label: 'AI Products built' }, { value: '16', label: 'Companies in RTMN' }, { value: '3', label: 'Live deployments' }] } },
  { id: 12, type: 'business', title: 'Business Model', content: { revenue: 'SaaS + Transaction + AI Agents', margin: '85%+ gross margins on software', tpv: 'Payment flow through RTMN network' } },
  { id: 13, type: 'team', title: 'Leadership Team', content: { team: ['Rejaul Karim', 'CEO & Founder', '20+ years in enterprise software', 'Built and scaled 3 SaaS companies', '', '', '', '', 'Advisory Board', 'Former Salesforce VP', 'Former SAP Chief Architect', 'Stanford AI Researcher'] } },
  { id: 14, type: 'timeline', title: 'Roadmap to $100M ARR', content: { timeline: [{ phase: 'Q3 2026: Foundation', items: ['Launch 5 Industry OS (Live)', '100 beta customers', '$500K ARR'] }, { phase: 'Q4 2026: Scale', items: ['24 Industry OS complete', '1,000 paying customers', '$5M ARR'] }, { phase: 'Q1 2027: Expand', items: ['International markets', '10,000 customers', '$20M ARR'] }, { phase: 'Q2 2027: Dominate', items: ['Market leadership', '50,000+ customers', '$100M ARR'] }] } },
  { id: 15, type: 'ask', title: 'The Ask', content: { deal: 'Raising $15M Series A', valuation: '$75M pre-money valuation', stats: [{ value: '$15M', label: 'Target raise' }, { value: '20x', label: 'Return potential' }, { value: '3-5x', label: 'Revenue multiple' }] } },
  { id: 16, type: 'useOfFunds', title: 'Use of Funds', content: { points: ['Engineering: 50% — Scale platform & AI capabilities', 'Sales & Marketing: 30% — Go-to-market acceleration', 'Operations: 20% — Support infrastructure & team'] } },
  { id: 17, type: 'whyNow', title: 'Why Now', content: { threeShifts: [{ title: 'AI Maturity', description: 'LLMs have reached enterprise-grade reliability. The infrastructure is ready.' }, { title: 'Market Consolidation', description: 'Legacy vendors are failing. Customers are hungry for AI-native alternatives.' }, { title: 'RTMN Network', description: 'First-mover advantage on the largest multi-industry AI network.' }] } },
  { id: 18, type: 'vision', title: 'Our Vision', content: { tagline: 'Every business runs on HOJAI AI. Every industry transformed by autonomous intelligence.' } },
  { id: 19, type: 'contact', title: 'Let\'s Build the Future', content: { contact: 'Rejaul Karim', email: 'rejaul@hojai.ai', stats: [{ value: 'hojai.ai', label: 'Website' }, { value: 'rtmn.network', label: 'Platform' }] } },
];

// Icon component
const IconRenderer = ({ name, className = "w-6 h-6" }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    'brain': <Brain className={className} />,
    'zap': <Zap className={className} />,
    'users': <Users className={className} />,
    'chart': <BarChart3 className={className} />,
    'globe': <Globe className={className} />,
    'building': <Building2 className={className} />,
    'target': <Target className={className} />,
    'rocket': <Rocket className={className} />,
    'shield': <Shield className={className} />,
    'clock': <Clock className={className} />,
    'star': <Star className={className} />,
    'sparkles': <Sparkles className={className} />,
    'layers': <Layers className={className} />,
    'cpu': <Cpu className={className} />,
    'network': <Network className={className} />,
    'database': <Database className={className} />,
    'trending': <TrendingUp className={className} />,
    'award': <Award className={className} />,
    'heart': <Brain className={className} />,
    'book': <Brain className={className} />,
    'car': <Rocket className={className} />,
    'dumbbell': <Sparkles className={className} />,
    'factory': <Building2 className={className} />,
    'scale': <Shield className={className} />,
    'shopping-bag': <ShoppingBag className={className} />,
    'copy': <Layers className={className} />,
  };
  return icons[name] || <Sparkles className={className} />;
};

const ShoppingBag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

// Content renderers
const CoverSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <div className="mb-8">
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 backdrop-blur-sm">
        <Brain className="w-5 h-5 text-indigo-400" />
        <span className="text-sm font-medium text-indigo-300">AI-Native Operating System</span>
      </div>
    </div>
    <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
      HOJAI AI
    </h1>
    <p className="text-2xl text-slate-300 mb-8 max-w-2xl">
      {content.subtitle}
    </p>
    <div className="flex items-center gap-4 text-sm text-slate-400">
      <span className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">{content.tagline}</span>
    </div>
    <div className="absolute bottom-20 flex items-center gap-2 text-slate-500">
      <ChevronRight className="w-4 h-4" />
      <span className="text-sm">Press → to begin</span>
    </div>
  </div>
);

const ProblemSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-red-500/20">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-400 uppercase tracking-wider">The Problem</span>
      </div>
      <p className="text-xl text-slate-300 max-w-3xl">{content.problem}</p>
    </div>
    <div className="grid grid-cols-3 gap-6">
      {content.stats?.map((stat, i) => (
        <div key={i} className="p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          <div className="text-5xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
            {stat.value}
          </div>
          <div className="text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const SolutionSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/20">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">The Solution</span>
      </div>
      <h2 className="text-5xl font-bold text-white mb-6">One OS. Every Industry.</h2>
      <p className="text-xl text-slate-300 max-w-3xl">{content.solution}</p>
    </div>
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-3xl"></div>
      <div className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-4">
          {['Restaurant', 'Hotel', 'Healthcare', 'Retail', 'Legal', 'Education', 'Fitness', 'Manufacturing'].map((industry) => (
            <div key={industry} className="px-4 py-3 rounded-xl bg-slate-700/50 text-center text-sm text-slate-300">
              {industry} OS
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <span className="text-indigo-400 font-medium">+16 more industries</span>
        </div>
      </div>
    </div>
  </div>
);

const PlatformSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Platform Architecture</span>
      <h2 className="text-4xl font-bold text-white mt-2">15-Layer AI Platform</h2>
    </div>
    <div className="grid grid-cols-5 gap-3">
      {content.layers?.map((layer, i) => (
        <div key={i} className="group relative">
          <div className={`p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
            i < 5 ? 'bg-indigo-500/20 border-indigo-500/30' :
            i < 10 ? 'bg-purple-500/20 border-purple-500/30' :
            'bg-pink-500/20 border-pink-500/30'
          }`}>
            <div className="text-xs text-slate-400 mb-1">{i + 1}</div>
            <div className="font-medium text-white text-sm">{layer.name}</div>
            <div className="text-xs text-slate-500 mt-1 truncate">{layer.services}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-8 flex items-center gap-8 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-indigo-500/50"></div>
        <span className="text-slate-400">Intelligence (1-5)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-purple-500/50"></div>
        <span className="text-slate-400">Operations (6-10)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-pink-500/50"></div>
        <span className="text-slate-400">Autonomous (11-15)</span>
      </div>
    </div>
  </div>
);

const IndustriesSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Industry OS</span>
      <h2 className="text-4xl font-bold text-white mt-2">24 Industry Operating Systems</h2>
    </div>
    <div className="grid grid-cols-2 gap-6">
      {content.features?.map((feature, i) => (
        <div key={i} className="p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <IconRenderer name={feature.icon} className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ThreeShiftsSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Core Innovation</span>
      <h2 className="text-4xl font-bold text-white mt-2">The Three Shifts</h2>
    </div>
    <div className="grid grid-cols-3 gap-8">
      {content.threeShifts?.map((shift, i) => (
        <div key={i} className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
          <div className="relative p-8 rounded-3xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-xl">
            <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
              0{i + 1}
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{shift.title}</h3>
            <p className="text-slate-400">{shift.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProductsSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Products</span>
      <h2 className="text-4xl font-bold text-white mt-2">190+ AI Products</h2>
    </div>
    <div className="space-y-4">
      {content.points?.map((point, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <span className="text-slate-300">{point}</span>
        </div>
      ))}
    </div>
  </div>
);

const MarketSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-12">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Market Opportunity</span>
      <h2 className="text-5xl font-bold text-white mt-2">$890B Market Opportunity</h2>
      <p className="text-xl text-slate-300 mt-6 max-w-3xl">{content.opportunity}</p>
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
        <div className="text-4xl font-bold text-white mb-2">$890B</div>
        <div className="text-slate-400">TAM by 2028</div>
      </div>
      <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        <div className="text-4xl font-bold text-white mb-2">40%</div>
        <div className="text-slate-400">AI capture rate</div>
      </div>
      <div className="p-8 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30">
        <div className="text-4xl font-bold text-white mb-2">3x</div>
        <div className="text-slate-400">Faster growth</div>
      </div>
    </div>
  </div>
);

const TractionSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Traction</span>
      <h2 className="text-4xl font-bold text-white mt-2">Traction & Momentum</h2>
    </div>
    <div className="grid grid-cols-4 gap-6">
      {content.stats?.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {stat.value}
          </div>
          <div className="text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
    <div className="mt-12 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-green-400 font-medium">Vercel Deploy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-green-400 font-medium">Render Deploy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-green-400 font-medium">E2E Tested</span>
        </div>
      </div>
    </div>
  </div>
);

const BusinessSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Business Model</span>
      <h2 className="text-4xl font-bold text-white mt-2">Recurring Revenue</h2>
    </div>
    <div className="grid grid-cols-3 gap-8">
      <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
        <div className="text-3xl font-bold text-white mb-2">{content.revenue}</div>
        <div className="text-slate-400">Revenue Streams</div>
      </div>
      <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        <div className="text-3xl font-bold text-white mb-2">{content.margin}</div>
        <div className="text-slate-400">Gross Margins</div>
      </div>
      <div className="p-8 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30">
        <div className="text-3xl font-bold text-white mb-2">{content.tpv}</div>
        <div className="text-slate-400">Payment Volume</div>
      </div>
    </div>
  </div>
);

const TeamSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Team</span>
      <h2 className="text-4xl font-bold text-white mt-2">Leadership</h2>
    </div>
    <div className="grid grid-cols-2 gap-8">
      <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-4 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">RK</span>
        </div>
        <h3 className="text-xl font-bold text-white">{content.team?.[0]}</h3>
        <p className="text-indigo-400 mb-4">{content.team?.[1]}</p>
        <div className="space-y-2 text-sm text-slate-400">
          <p>{content.team?.[2]}</p>
          <p>{content.team?.[3]}</p>
        </div>
      </div>
      <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">{content.team?.[8]}</h3>
        <p className="text-indigo-400 mb-4">Advisory Board</p>
        <div className="space-y-2 text-sm text-slate-400">
          <p>{content.team?.[9]}</p>
          <p>{content.team?.[10]}</p>
          <p>{content.team?.[11]}</p>
        </div>
      </div>
    </div>
  </div>
);

const TimelineSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Roadmap</span>
      <h2 className="text-4xl font-bold text-white mt-2">Path to $100M ARR</h2>
    </div>
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
      <div className="space-y-6">
        {content.timeline?.map((item, i) => (
          <div key={i} className="relative flex items-start gap-6 pl-12">
            <div className="absolute left-4 w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 border-4 border-slate-900"></div>
            <div className="flex-1 p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="text-lg font-bold text-white mb-2">{item.phase}</h3>
              <div className="space-y-1">
                {item.items.map((it, j) => (
                  <p key={j} className="text-sm text-slate-400">{it}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AskSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Investment</span>
      <h2 className="text-5xl font-bold text-white mt-2">{content.deal}</h2>
      <p className="text-xl text-slate-300 mt-4">Pre-money valuation: {content.valuation}</p>
    </div>
    <div className="grid grid-cols-3 gap-6">
      {content.stats?.map((stat, i) => (
        <div key={i} className="p-8 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-center">
          <div className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {stat.value}
          </div>
          <div className="text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const UseOfFundsSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col justify-center h-full px-16">
    <div className="mb-8">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Allocation</span>
      <h2 className="text-4xl font-bold text-white mt-2">Use of Funds</h2>
    </div>
    <div className="space-y-6">
      {content.points?.map((point, i) => (
        <div key={i} className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl"></div>
          <div className="relative p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-6">
            <div className={`text-3xl font-bold ${
              i === 0 ? 'text-indigo-400' : i === 1 ? 'text-purple-400' : 'text-pink-400'
            }`}>
              {i === 0 ? '50%' : i === 1 ? '30%' : '20%'}
            </div>
            <span className="text-slate-300">{point}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const VisionSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col items-center justify-center h-full px-16 text-center">
    <div className="max-w-4xl">
      <span className="text-sm font-medium text-indigo-400 uppercase tracking-wider">Vision</span>
      <h2 className="text-5xl font-bold text-white mt-4 mb-8">{content.tagline}</h2>
      <div className="flex items-center justify-center gap-4">
        <div className="px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700">
          <Brain className="w-5 h-5 text-indigo-400 inline mr-2" />
          <span className="text-slate-300">AI-Native</span>
        </div>
        <div className="px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700">
          <Globe className="w-5 h-5 text-purple-400 inline mr-2" />
          <span className="text-slate-300">Multi-Industry</span>
        </div>
        <div className="px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700">
          <Rocket className="w-5 h-5 text-pink-400 inline mr-2" />
          <span className="text-slate-300">Autonomous</span>
        </div>
      </div>
    </div>
  </div>
);

const ContactSlide = ({ content }: { content: ContentType }) => (
  <div className="flex flex-col items-center justify-center h-full px-16 text-center">
    <div className="mb-8">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-6 inline-block">
        <Sparkles className="w-12 h-12 text-indigo-400" />
      </div>
      <h2 className="text-5xl font-bold text-white mb-4">Let&apos;s Build the Future</h2>
    </div>
    <div className="space-y-4">
      <p className="text-2xl text-white">{content.contact}</p>
      <p className="text-xl text-indigo-400">{content.email}</p>
    </div>
    <div className="mt-12 grid grid-cols-2 gap-6">
      {content.stats?.map((stat, i) => (
        <div key={i} className="px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="text-lg font-medium text-white">{stat.value}</div>
          <div className="text-sm text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// Main component
export default function DeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
    setShowOverview(false);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          nextSlide();
          break;
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          setShowOverview((prev) => !prev);
          break;
        case 'Home':
          goToSlide(0);
          break;
        case 'End':
          goToSlide(slides.length - 1);
          break;
        case 'Escape':
          if (showOverview) setShowOverview(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, toggleFullscreen, goToSlide, showOverview]);

  const renderSlide = (slide: Slide) => {
    const props = { content: slide.content };
    switch (slide.type) {
      case 'cover': return <CoverSlide {...props} />;
      case 'problem': return <ProblemSlide {...props} />;
      case 'solution': return <SolutionSlide {...props} />;
      case 'platform': return <PlatformSlide {...props} />;
      case 'industries':
      case 'industries2': return <IndustriesSlide {...props} />;
      case 'threeShifts': return <ThreeShiftsSlide {...props} />;
      case 'products':
      case 'products2': return <ProductsSlide {...props} />;
      case 'market': return <MarketSlide {...props} />;
      case 'traction': return <TractionSlide {...props} />;
      case 'business': return <BusinessSlide {...props} />;
      case 'team': return <TeamSlide {...props} />;
      case 'timeline': return <TimelineSlide {...props} />;
      case 'ask': return <AskSlide {...props} />;
      case 'useOfFunds': return <UseOfFundsSlide {...props} />;
      case 'whyNow': return <ThreeShiftsSlide {...props} />;
      case 'vision': return <VisionSlide {...props} />;
      case 'contact': return <ContactSlide {...props} />;
      default: return (
        <div className="flex items-center justify-center h-full">
          <h2 className="text-4xl font-bold text-white">{slide.title}</h2>
        </div>
      );
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-slate-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-2 left-0 right-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-300 text-sm">
              {currentSlide + 1} / {slides.length}
            </span>

            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-px h-4 bg-slate-700" />
              <button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setShowOverview(!showOverview)}
              className="p-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide content */}
      <main className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto transition-all duration-300">
          {renderSlide(slides[currentSlide])}
        </div>
      </main>

      {/* Overview modal */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/95 backdrop-blur-md">
          <div className="w-full max-w-6xl max-h-full overflow-y-auto">
            <div className="grid grid-cols-6 gap-4">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(i)}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    i === currentSlide
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs text-slate-500 mb-1">{i + 1}</div>
                  <div className="text-sm font-medium text-white truncate">{slide.title}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowOverview(false)}
                className="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Press ESC to close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-xs text-slate-500">
        <span>← → Navigate</span>
        <span>F Fullscreen</span>
        <span>O Overview</span>
      </div>
    </div>
  );
}
