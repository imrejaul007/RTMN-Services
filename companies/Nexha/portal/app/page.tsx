import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">N</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NeXha Commerce</h1>
              <p className="text-xs text-gray-500">B2B Network · Powered by RTMN</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/onboard-guest" className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
              Join as Supplier (No GST)
            </Link>
            <Link href="/onboard-supplier" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Register Business
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Commerce Network Live · June 2026
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
            The B2B Commerce Network for India&apos;s Businesses
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Connect suppliers, buyers, and distributors on a single network.
            Onboard in minutes — with or without GST. Get paid reliably.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/onboard-guest" className="px-8 py-4 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
              Start as Supplier (Free, No GST)
            </Link>
            <Link href="/onboard-supplier" className="px-8 py-4 text-lg font-semibold text-gray-700 border-2 border-gray-300 rounded-xl hover:border-gray-400 transition">
              Register Business Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Built for Commerce Networks</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'No GST Required',
                desc: 'Start selling immediately with a WhatsApp-verified guest account. Upgrade to full business when ready.',
                icon: '📱',
              },
              {
                title: 'Universal Identity',
                desc: 'One CorpID across the entire RTMN ecosystem. Suppliers, buyers, and agents all on the same trust layer.',
                icon: '🔐',
              },
              {
                title: 'Auto Reputation',
                desc: 'Delivery, quality, and payment scores built automatically from your transaction history. No manual reviews.',
                icon: '⭐',
              },
              {
                title: 'RFQ Marketplace',
                desc: 'Post what you need. Get quotes from verified suppliers. Track every offer through to deal.',
                icon: '📋',
              },
              {
                title: 'Trade Finance',
                desc: 'BNPL, credit lines, and working capital built into the network. No separate bank visits.',
                icon: '💰',
              },
              {
                title: 'WhatsApp Native',
                desc: 'Receive RFQs, deal updates, and payment alerts directly on WhatsApp. No app download required.',
                icon: '💬',
              },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[['24+', 'Industry Verticals'], ['4702+', 'Active Suppliers'], ['35+', 'Digital Twins'], ['100%', 'Digital Onboarding']].map(([n, l]) => (
            <div key={l}>
              <div className="text-4xl font-bold">{n}</div>
              <div className="text-blue-200 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <p>NeXha Commerce Network · Part of RTMN Ecosystem · &copy; 2026</p>
      </footer>
    </main>
  );
}
