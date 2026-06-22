import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero Section */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">
              L
            </div>
            <span className="text-xl font-semibold">LawGens</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-400 hover:text-white transition">
              Login
            </Link>
            <Link href="/signup" className="bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg font-medium transition">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Legal Intelligence for Everyone
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            AI-Powered Legal Research, Contract Analysis & Compliance Management.
            Making legal expertise accessible to every business and individual.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="bg-amber-500 hover:bg-amber-600 px-8 py-4 rounded-xl font-semibold text-lg transition">
              Start Free Trial
            </Link>
            <Link href="/demo" className="border border-slate-600 hover:border-slate-500 px-8 py-4 rounded-xl font-semibold text-lg transition">
              Watch Demo
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: '📄', title: 'Contract Analysis', desc: 'AI-powered review of contract terms, risks, and obligations' },
              { icon: '⚖️', title: 'Court Research', desc: 'Search judgments across Indian courts and track case status' },
              { icon: '🛡️', title: 'Compliance', desc: 'Stay updated on regulatory compliance deadlines and requirements' },
              { icon: '📝', title: 'Document Generation', desc: 'Create standard contracts from templates with AI assistance' },
              { icon: '🔍', title: 'Legal Research', desc: 'Access case law, statutes, and legal precedents instantly' },
              { icon: '💼', title: 'Risk Assessment', desc: 'Identify and mitigate legal risks in your business' },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-amber-500/50 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing Plans</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: 'Free', features: ['5 contract analyses/month', 'Basic templates', 'Email support'] },
              { name: 'Professional', price: '₹999/mo', features: ['50 analyses/month', 'All templates', 'Priority support', 'API access'] },
              { name: 'Enterprise', price: '₹4,999/mo', features: ['Unlimited analyses', 'API access', 'Dedicated support', 'Custom integrations'] },
            ].map((plan, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-amber-400 mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-slate-400">✓ {f}</li>
                  ))}
                </ul>
                <button className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-medium transition">
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-400">
          <p>© 2026 LawGens by RTNM Digital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}