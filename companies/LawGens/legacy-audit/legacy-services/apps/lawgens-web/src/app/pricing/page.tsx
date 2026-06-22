'use client';

import { useState } from 'react';

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for individuals',
    features: ['5 analyses/month', 'Basic templates', 'Email support'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/month',
    description: 'For professionals',
    features: ['50 analyses/month', 'All templates', 'Priority support', 'API access'],
    cta: 'Start Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/month',
    description: 'For organizations',
    features: ['Unlimited analyses', 'API access', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">L</div>
            <span className="text-xl font-semibold">LawGens</span>
          </div>
          <a href="/login" className="text-slate-400 hover:text-white">Login</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-slate-400 text-center mb-12">Choose the plan that fits your needs</p>

        <div className="grid grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-8 border-2 ${plan.popular ? 'bg-slate-800 border-amber-500' : 'bg-slate-800/50 border-slate-700'}`}>
              {plan.popular && <div className="bg-amber-500 text-center py-1 rounded-full text-sm font-medium mb-4 -mt-16">Most Popular</div>}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-slate-400">{plan.period || ''}</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">{plan.description}</p>
              <ul className="space-y-2 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-3 rounded-lg font-medium ${plan.popular ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
