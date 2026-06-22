export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">L</div>
          <span className="text-xl font-semibold">LawGens</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: June 12, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly, including name, email, company details, and contract documents for analysis.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <p>We use your information to provide legal AI services, improve our products, and ensure compliance with applicable regulations including GDPR and DPDPA.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption, access controls, and regular security audits.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@lawgens.app for any requests.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
