import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ServiceRFQForm, { ServiceRFQFormData } from '../components/ServiceRFQForm';

// Category metadata
const categoryData: Record<string, {
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  providers: Array<{
    id: string;
    name: string;
    rating: number;
    reviews: number;
    specialization: string;
    verified: boolean;
    responseTime: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}> = {
  'technology-it': {
    name: 'Technology & IT',
    description: 'Software development, web design, IT support, cloud services, and digital transformation solutions.',
    accentColor: '#8B5CF6',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    providers: [
      { id: 'p1', name: 'TechCore Solutions', rating: 4.9, reviews: 234, specialization: 'Enterprise Software', verified: true, responseTime: '< 1 hour' },
      { id: 'p2', name: 'CloudFirst Systems', rating: 4.8, reviews: 189, specialization: 'Cloud Architecture', verified: true, responseTime: '< 2 hours' },
      { id: 'p3', name: 'DigitalCraft Agency', rating: 4.7, reviews: 156, specialization: 'Web & Mobile Apps', verified: true, responseTime: '< 3 hours' },
      { id: 'p4', name: 'SecureNet Consulting', rating: 4.9, reviews: 98, specialization: 'Cybersecurity', verified: true, responseTime: '< 1 hour' },
    ],
    faqs: [
      { question: 'What technologies do you specialize in?', answer: 'Our providers specialize in a wide range of technologies including React, Node.js, Python, AWS, Azure, and more.' },
      { question: 'How do you ensure project security?', answer: 'All providers follow industry best practices including secure coding, data encryption, and compliance with relevant regulations.' },
    ],
  },
  'marketing-advertising': {
    name: 'Marketing & Advertising',
    description: 'Digital marketing, social media management, SEO optimization, content creation, and brand strategy.',
    accentColor: '#EC4899',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    providers: [
      { id: 'p5', name: 'GrowthLab Marketing', rating: 4.8, reviews: 312, specialization: 'Growth Marketing', verified: true, responseTime: '< 2 hours' },
      { id: 'p6', name: 'SocialPulse Agency', rating: 4.7, reviews: 245, specialization: 'Social Media', verified: true, responseTime: '< 1 hour' },
      { id: 'p7', name: 'SEO Masters Pro', rating: 4.9, reviews: 178, specialization: 'Search Optimization', verified: true, responseTime: '< 3 hours' },
    ],
    faqs: [
      { question: 'How long does it take to see results?', answer: 'Results vary by strategy. SEO typically takes 3-6 months, while PPC can show immediate results.' },
      { question: 'Do you provide monthly reports?', answer: 'Yes, all marketing services include detailed monthly performance reports with key metrics.' },
    ],
  },
  'financial-services': {
    name: 'Financial Services',
    description: 'Accounting, tax preparation, financial planning, payroll services, and business consulting.',
    accentColor: '#10B981',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    providers: [
      { id: 'p8', name: 'FinTrust Advisors', rating: 4.9, reviews: 567, specialization: 'Tax & Compliance', verified: true, responseTime: '< 4 hours' },
      { id: 'p9', name: 'BizBalance Accounting', rating: 4.8, reviews: 423, specialization: 'SMB Accounting', verified: true, responseTime: '< 2 hours' },
      { id: 'p10', name: 'WealthPath Consultants', rating: 4.7, reviews: 234, specialization: 'Financial Planning', verified: true, responseTime: '< 3 hours' },
    ],
    faqs: [
      { question: 'Are your services compliant with Indian tax laws?', answer: 'Yes, all financial service providers are certified and up-to-date with GST, Income Tax, and other regulatory requirements.' },
      { question: 'Can you handle international transactions?', answer: 'Several providers specialize in international financial services including forex, cross-border transactions, and compliance.' },
    ],
  },
  'legal-services': {
    name: 'Legal Services',
    description: 'Contract review, legal consultation, intellectual property, business registration, and compliance.',
    accentColor: '#F59E0B',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    providers: [
      { id: 'p11', name: 'LegalShield Associates', rating: 4.9, reviews: 345, specialization: 'Corporate Law', verified: true, responseTime: '< 6 hours' },
      { id: 'p12', name: 'IP Protect India', rating: 4.8, reviews: 189, specialization: 'Intellectual Property', verified: true, responseTime: '< 4 hours' },
      { id: 'p13', name: 'Startup Legal Hub', rating: 4.7, reviews: 234, specialization: 'Business Registration', verified: true, responseTime: '< 2 hours' },
    ],
    faqs: [
      { question: 'Do you provide legal opinions?', answer: 'Yes, qualified legal professionals can provide documented legal opinions for your specific requirements.' },
      { question: 'What types of contracts can you review?', answer: 'We cover NDAs, employment contracts, vendor agreements, partnership deeds, and more.' },
    ],
  },
  'human-resources': {
    name: 'Human Resources',
    description: 'Recruitment, staffing, employee training, HR consulting, payroll management, and benefits.',
    accentColor: '#3B82F6',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    providers: [
      { id: 'p14', name: 'TalentFirst HR', rating: 4.8, reviews: 456, specialization: 'Executive Search', verified: true, responseTime: '< 2 hours' },
      { id: 'p15', name: 'Workforce Pro', rating: 4.7, reviews: 312, specialization: 'Staffing Solutions', verified: true, responseTime: '< 1 hour' },
      { id: 'p16', name: 'LearnHub Corporate', rating: 4.9, reviews: 178, specialization: 'Corporate Training', verified: true, responseTime: '< 4 hours' },
    ],
    faqs: [
      { question: 'What industries do you recruit for?', answer: 'Our HR partners cover technology, finance, healthcare, manufacturing, retail, and more.' },
      { question: 'Do you offer background verification?', answer: 'Yes, most recruitment services include comprehensive background checks as part of the process.' },
    ],
  },
  'logistics-supply-chain': {
    name: 'Logistics & Supply Chain',
    description: 'Warehouse management, freight forwarding, inventory management, and supply chain optimization.',
    accentColor: '#EF4444',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    providers: [
      { id: 'p17', name: 'SwiftLogix Solutions', rating: 4.8, reviews: 567, specialization: 'Express Delivery', verified: true, responseTime: '< 2 hours' },
      { id: 'p18', name: 'GlobalFreight Partners', rating: 4.7, reviews: 345, specialization: 'International Shipping', verified: true, responseTime: '< 4 hours' },
      { id: 'p19', name: 'WareMax Storage', rating: 4.9, reviews: 234, specialization: 'Warehousing', verified: true, responseTime: '< 3 hours' },
    ],
    faqs: [
      { question: 'What regions do you cover?', answer: 'Our logistics partners provide coverage across India with international shipping options.' },
      { question: 'Can you handle temperature-sensitive goods?', answer: 'Yes, several providers offer cold chain and specialized storage solutions.' },
    ],
  },
  'design-creative': {
    name: 'Design & Creative',
    description: 'Graphic design, UI/UX design, video production, animation, branding, and creative content.',
    accentColor: '#8B5CF6',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    providers: [
      { id: 'p20', name: 'PixelCraft Studio', rating: 4.9, reviews: 456, specialization: 'Brand Identity', verified: true, responseTime: '< 2 hours' },
      { id: 'p21', name: 'UI/UX Masters', rating: 4.8, reviews: 312, specialization: 'Interface Design', verified: true, responseTime: '< 3 hours' },
      { id: 'p22', name: 'MotionWorks Studio', rating: 4.7, reviews: 189, specialization: 'Animation & Video', verified: true, responseTime: '< 4 hours' },
    ],
    faqs: [
      { question: 'What file formats do you deliver?', answer: 'Standard formats include PNG, JPG, SVG, PDF, and source files like AI/PSD/Figma.' },
      { question: 'Do you include revisions?', answer: 'Yes, most design packages include 2-3 rounds of revisions based on feedback.' },
    ],
  },
  'consulting-strategy': {
    name: 'Consulting & Strategy',
    description: 'Business consulting, strategy planning, market research, process optimization, and growth advisory.',
    accentColor: '#06B6D4',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    providers: [
      { id: 'p23', name: 'StrategyEdge Consulting', rating: 4.9, reviews: 234, specialization: 'Business Strategy', verified: true, responseTime: '< 4 hours' },
      { id: 'p24', name: 'MarketIQ Research', rating: 4.8, reviews: 189, specialization: 'Market Research', verified: true, responseTime: '< 6 hours' },
      { id: 'p25', name: 'ProcessOptima', rating: 4.7, reviews: 156, specialization: 'Operations', verified: true, responseTime: '< 3 hours' },
    ],
    faqs: [
      { question: 'What industries do you specialize in?', answer: 'Our consulting partners have expertise across technology, healthcare, finance, retail, and manufacturing.' },
      { question: 'Do you provide on-site consultations?', answer: 'Yes, most consulting services offer both virtual and on-site engagement options.' },
    ],
  },
};

interface PageProps {
  params: Promise<{ category: string }>;
}

export default function CategoryPage({ params }: PageProps) {
  const { category } = use(params);
  const [activeTab, setActiveTab] = useState<'form' | 'providers' | 'faq'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categoryInfo = categoryData[category] || {
    name: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Service category details',
    accentColor: '#8B5CF6',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    providers: [],
    faqs: [],
  };

  const handleSubmit = async (data: ServiceRFQFormData) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      logger.info('Service RFQ submitted:', data);
      setSubmitSuccess(true);
    } catch (error) {
      logger.error('Failed to submit RFQ:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#0f0f1a]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Request Submitted Successfully!</h2>
            <p className="text-gray-400 mb-6">
              Your service request has been sent to verified providers. You will receive quotes within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/services"
                className="px-6 py-3 bg-[#2d2d44] text-white font-medium rounded-xl hover:bg-[#3d3d54] transition-colors"
              >
                Browse More Services
              </Link>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-500 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Header */}
      <div className="border-b border-[#2d2d44] bg-[#13131f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-4">
            <Link href="/services" className="text-gray-400 hover:text-white transition-colors">
              Services
            </Link>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white font-medium">{categoryInfo.name}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${categoryInfo.accentColor}20`, color: categoryInfo.accentColor }}
            >
              {categoryInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{categoryInfo.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{categoryInfo.description}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6">
            {(['form', 'providers', 'faq'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                  ${activeTab === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d2d44]'
                  }
                `}
              >
                {tab === 'faq' ? 'FAQ' : tab === 'form' ? 'Request Quote' : 'Providers'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'form' && (
              <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Request a Quote</h2>
                <ServiceRFQForm
                  category={categoryInfo.name}
                  categorySlug={category}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {activeTab === 'providers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Service Providers</h2>
                  <p className="text-sm text-gray-400">{categoryInfo.providers.length} providers available</p>
                </div>

                {categoryInfo.providers.map(provider => (
                  <div key={provider.id} className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-5 hover:border-violet-500/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-violet-400">
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{provider.name}</h3>
                            {provider.verified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">{provider.specialization}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm font-medium text-white">{provider.rating}</span>
                              <span className="text-sm text-gray-500">({provider.reviews})</span>
                            </div>
                            <span className="text-xs text-gray-500">|</span>
                            <span className="text-xs text-gray-400">Responds {provider.responseTime}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('form')}
                        className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
                {categoryInfo.faqs.map((faq, index) => (
                  <details key={index} className="group bg-[#1a1a2e] border border-[#2d2d44] rounded-xl">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                      <span className="font-medium text-white">{faq.question}</span>
                      <span className="transition-transform group-open:rotate-180">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-gray-400">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Category Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Available Providers</span>
                  <span className="text-lg font-bold text-white">{categoryInfo.providers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg Response Time</span>
                  <span className="text-sm font-medium text-emerald-400">&lt; 4 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Satisfaction Rate</span>
                  <span className="text-sm font-medium text-emerald-400">98%</span>
                </div>
              </div>
            </div>

            {/* Service Guarantee */}
            <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/10 border border-violet-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">Service Guarantee</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified providers only
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Secure payment protection
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Satisfaction guaranteed
                </li>
              </ul>
            </div>

            {/* Need Help */}
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Need Help?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Our support team is available 24/7 to assist you with your service requests.
              </p>
              <button className="w-full py-2.5 bg-[#2d2d44] text-white font-medium rounded-lg hover:bg-[#3d3d54] transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat with Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
