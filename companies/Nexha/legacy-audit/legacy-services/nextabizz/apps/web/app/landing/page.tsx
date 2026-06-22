'use client';

import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold text-white">nextaBizz</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</a>
              <a href="#docs" className="text-slate-300 hover:text-white transition-colors">Docs</a>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-slate-300 hover:text-white transition-colors">Login</a>
              <a href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-8">
              <span className="text-indigo-300 text-sm font-medium">B2B Procurement Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Streamline Your
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Procurement
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Connect restaurants with suppliers, manage purchase orders, automate RFQs, and optimize your inventory procurement workflow.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/dashboard" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25">
                Start Free Trial
              </a>
              <a href="#demo" className="w-full sm:w-auto border border-slate-600 hover:border-slate-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
                Watch Demo
              </a>
            </div>

            <div className="mt-16 flex items-center justify-center space-x-8 text-slate-500">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">No credit card</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">14-day trial</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-center text-slate-500 mb-8 text-sm uppercase tracking-wider">Trusted by 500+ restaurants across India</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
            {['Fresh Farms', 'Urban Kitchen', 'FoodHub', 'Chef\'s Table', 'Restaurant Group'].map((brand) => (
              <span key={brand} className="text-xl font-semibold text-slate-400">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need for Procurement</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              From vendor management to order fulfillment, nextaBizz handles your entire procurement workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🏢',
                title: 'Vendor Directory',
                description: 'Manage suppliers with ratings, GST details, and performance tracking. Build strong vendor relationships.'
              },
              {
                icon: '📋',
                title: 'Purchase Orders',
                description: 'Create, send, and track purchase orders. Get real-time status updates from suppliers.'
              },
              {
                icon: '📝',
                title: 'RFQ Engine',
                description: 'Automate requests for quotation. Compare bids and award contracts to the best suppliers.'
              },
              {
                icon: '📦',
                title: 'Inventory Sync',
                description: 'Receive signals from ReStopapa for low stock alerts. Automatic reorder suggestions.'
              },
              {
                icon: '📊',
                title: 'Analytics',
                description: 'Track spending patterns, supplier performance, and procurement KPIs with visual dashboards.'
              },
              {
                icon: '🔗',
                title: 'ReStopapa Integration',
                description: 'Seamless webhook integration. Connect your restaurant platform to procurement instantly.'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:border-indigo-500/50 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-slate-400">Get started in minutes with our simple setup process</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Your Systems',
                description: 'Integrate with ReStopapa via webhooks. Sync your inventory levels automatically.'
              },
              {
                step: '02',
                title: 'Add Your Vendors',
                description: 'Import suppliers with their GST details, pricing, and contact information.'
              },
              {
                step: '03',
                title: 'Start Procuring',
                description: 'Create POs and RFQs in seconds. Track deliveries and manage payments.'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-8xl font-bold text-indigo-500/10 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative pt-12">
                  <h3 className="text-2xl font-semibold text-white mb-4">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Flow */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-3xl p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Automatic Procurement Signals</h2>
                <p className="text-slate-300 mb-8 leading-relaxed">
                  When inventory runs low in ReStopapa, nextaBizz automatically creates RFQs and sends them to your preferred suppliers. No manual intervention needed.
                </p>
                <ul className="space-y-4">
                  {[
                    'inventory.low_stock → Creates RFQ',
                    'inventory.out_of_stock → Creates urgent RFQ',
                    'inventory.stock_updated → Syncs inventory',
                    'order.status_changed → Tracks orders'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <code className="bg-slate-800 px-3 py-1 rounded text-sm">{item}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-900/50 rounded-2xl p-8 font-mono text-sm">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-green-400">ReStopapa</span>
                    <span className="text-slate-500 ml-2">inventory.low_stock</span>
                  </div>
                  <div className="border-l-2 border-indigo-500/50 ml-1.5 pl-4 space-y-3">
                    <div className="text-indigo-400">↓ Webhook Received</div>
                    <div className="bg-slate-800/80 rounded p-3 text-slate-300">
                      {`{ "product": "Tomatoes", "qty": 5 }`}
                    </div>
                    <div className="text-indigo-400">↓ RFQ Created</div>
                    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded p-3 text-slate-300">
                      {`{ "rfqId": "RFQ-001", "urgent": true }`}
                    </div>
                    <div className="text-indigo-400">↓ Suppliers Notified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-slate-400">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '₹999',
                period: '/month',
                description: 'Perfect for single-location restaurants',
                features: [
                  'Up to 5 suppliers',
                  '100 POs/month',
                  'Basic analytics',
                  'Email support'
                ]
              },
              {
                name: 'Growth',
                price: '₹2,999',
                period: '/month',
                description: 'For growing restaurant chains',
                features: [
                  'Up to 25 suppliers',
                  'Unlimited POs',
                  'Advanced analytics',
                  'RFQ automation',
                  'Priority support'
                ],
                popular: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large restaurant groups',
                features: [
                  'Unlimited suppliers',
                  'Custom integrations',
                  'Dedicated account manager',
                  'SLA guarantees',
                  'On-premise option'
                ]
              }
            ].map((plan, index) => (
              <div key={index} className={`relative bg-slate-800/50 border rounded-2xl p-8 ${plan.popular ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-700/50'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="/signup" className={`block text-center py-3 rounded-lg font-semibold transition-colors ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Docs Section */}
      <section id="docs" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Documentation</h2>
            <p className="text-xl text-slate-400">Get started with our comprehensive guides</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Quick Start',
                description: 'Get up and running in 5 minutes',
                link: '/docs/quickstart'
              },
              {
                title: 'API Reference',
                description: 'Complete REST API documentation',
                link: '/docs/api'
              },
              {
                title: 'Integrations',
                description: 'Connect with ReStopapa and more',
                link: '/docs/integrations'
              }
            ].map((doc, index) => (
              <a key={index} href={doc.link} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-indigo-500/50 transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">{doc.title}</h3>
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <p className="text-slate-400">{doc.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Optimize Your Procurement?</h2>
          <p className="text-xl text-slate-400 mb-10">
            Join 500+ restaurants already using nextaBizz to streamline their supply chain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/dashboard" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25">
              Start Free Trial
            </a>
            <a href="/contact" className="w-full sm:w-auto border border-slate-600 hover:border-slate-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-xl font-bold text-white">nextaBizz</span>
              </div>
              <p className="text-slate-400 text-sm">
                B2B procurement platform for the modern restaurant industry.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            <p>© 2026 nextaBizz. Built by CorpPerks. Part of the REZ Ecosystem.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
