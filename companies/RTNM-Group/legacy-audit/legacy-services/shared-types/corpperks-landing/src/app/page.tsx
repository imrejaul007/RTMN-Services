'use client';

import { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Gift,
  Hotel,
  Leaf,
  Shield,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Star,
  Zap,
  Globe,
} from 'lucide-react';

export default function CorpPerksLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">CorpPerks</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="text-gray-600 hover:text-gray-900 font-medium">Login</button>
              <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Get Started
              </button>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="px-4 space-y-4">
              <a href="#features" className="block text-gray-600">Features</a>
              <a href="#how-it-works" className="block text-gray-600">How it Works</a>
              <a href="#pricing" className="block text-gray-600">Pricing</a>
              <a href="#contact" className="block text-gray-600">Contact</a>
              <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-lg font-medium">
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Smart Corporate Spend & Benefits Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              One platform for{' '}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                employee benefits
              </span>
              , bookings & rewards
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Help companies manage meal allowances, travel bookings, GST invoices, corporate gifting,
              and employee rewards — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-300 transition-colors">
                Watch Demo
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none h-20 bottom-0 top-auto" />
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-2">Total Employees</div>
                  <div className="text-white text-2xl font-bold">250</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-2">Benefits Used</div>
                  <div className="text-white text-2xl font-bold">₹8.7L</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-2">GST Saved</div>
                  <div className="text-white text-2xl font-bold">₹1.2L</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-2">Active Campaigns</div>
                  <div className="text-white text-2xl font-bold">3</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm mb-8">Trusted by forward-thinking companies</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['TechCorp', 'InnovateCo', 'GrowthLabs', 'ScaleUp', 'NextGen'].map((company) => (
              <div key={company} className="text-xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why companies choose CorpPerks
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stop juggling multiple tools. Give your HR, Finance, and employees one platform for everything.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'For HR Teams',
                before: '5+ tools for benefits',
                after: 'One unified dashboard',
                color: 'purple',
              },
              {
                icon: CreditCard,
                title: 'For Finance',
                before: 'Manual expense tracking',
                after: 'Real-time spend visibility',
                color: 'blue',
              },
              {
                icon: Gift,
                title: 'For Employees',
                before: 'Confusing benefits portal',
                after: 'Seamless via ReZ app',
                color: 'green',
              },
              {
                icon: Hotel,
                title: 'Corporate Bookings',
                before: 'Expensive travel agents',
                after: 'GST-ready hotel bookings',
                color: 'orange',
              },
              {
                icon: Leaf,
                title: 'Karma & CSR',
                before: 'No employee engagement',
                after: 'Volunteer campaigns + rewards',
                color: 'emerald',
              },
              {
                icon: Shield,
                title: 'GST Compliance',
                before: 'Invoice chaos',
                after: 'Auto-generated GST invoices',
                color: 'indigo',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-gray-500 line-through">{item.before}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 font-medium">{item.after}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to manage benefits
            </h2>
            <p className="text-xl text-gray-600">
              From meal allowances to corporate gifting — we have you covered.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {[
              {
                title: 'Benefits Management',
                description: 'Set meal, travel, wellness, and learning allowances. Auto-track usage and reset monthly.',
                features: ['Custom benefit packages', 'Auto monthly reset', 'Department-level allocation'],
              },
              {
                title: 'Corporate Bookings',
                description: 'Book hotels at negotiated corporate rates. GST-ready invoices generated automatically.',
                features: ['Makcorps hotel network', 'GST invoices included', 'Approval workflows'],
              },
              {
                title: 'Employee Rewards',
                description: 'Give ReZ Coins for achievements. Employees redeem for gifts, vouchers, or experiences.',
                features: ['Tier system (Bronze to Platinum)', 'Milestone rewards', 'Referral bonuses'],
              },
              {
                title: 'Corporate Gifting',
                description: 'Bulk order festival gifts and client presents. NextaBizz integration for procurement.',
                features: ['Festival campaigns', 'Bulk pricing', 'Branded packaging'],
              },
              {
                title: 'Karma & CSR',
                description: 'Run volunteer campaigns and track environmental impact. Earn karma points for doing good.',
                features: ['Volunteer challenges', 'Impact tracking', 'Donation matching'],
              },
              {
                title: 'GST Invoicing',
                description: 'Generate GST-compliant invoices with ITC optimization. Export GSTR-1 reports with one click.',
                features: ['Auto GST calculation', 'GSTR-1 export', 'ITC optimization'],
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Your Company</h3>
              <p className="text-gray-600">
                Register your company and set up your admin dashboard in under 5 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enroll Employees</h3>
              <p className="text-gray-600">
                Sync via HRIS or add manually. Employees get access via the ReZ app.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage & Track</h3>
              <p className="text-gray-600">
                Allocate benefits, run campaigns, and track spending from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Pay per employee. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '49',
                description: 'For small teams getting started',
                features: ['Up to 50 employees', 'Core benefits', 'GST invoices', 'Email support'],
              },
              {
                name: 'Professional',
                price: '99',
                description: 'For growing companies',
                popular: true,
                features: ['Up to 500 employees', 'All Starter features', 'Corporate bookings', 'ReZ Coins rewards', 'Priority support'],
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: ['Unlimited employees', 'All Pro features', 'HRIS integrations', 'Custom campaigns', 'Dedicated account manager'],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-8 border-2 ${
                  plan.popular ? 'border-purple-500 relative' : 'border-gray-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 'Custom' ? 'Custom' : `₹${plan.price}`}
                  </span>
                  {plan.price !== 'Custom' && (
                    <span className="text-gray-500">/employee/month</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-semibold ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
                      : 'border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to simplify corporate benefits?
          </h2>
          <p className="text-xl text-purple-100 mb-10">
            Join forward-thinking companies using CorpPerks to manage employee benefits.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
                required
              />
              <button
                type="submit"
                className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
              >
                Get Started
              </button>
            </form>
          ) : (
            <div className="bg-white/20 rounded-xl p-6 max-w-md mx-auto">
              <CheckCircle className="w-12 h-12 text-white mx-auto mb-4" />
              <p className="text-white font-medium">Thanks! We'll be in touch within 24 hours.</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-8 mt-12 text-purple-100">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-current" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <span>500+ companies</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">CorpPerks</span>
              </div>
              <p className="text-sm">
                Smart corporate spend and benefits platform for modern companies.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2026 CorpPerks. All rights reserved.</p>
            <p className="text-sm mt-2 md:mt-0">
              Part of the <span className="text-purple-400">ReZ</span> ecosystem
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
