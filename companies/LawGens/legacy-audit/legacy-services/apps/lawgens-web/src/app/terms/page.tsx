export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">L</div>
          <span className="text-xl font-semibold">LawGens</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Last updated: June 12, 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using LawGens services, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use of Service</h2>
            <p>You may use our services only for lawful purposes and in accordance with these Terms. You agree not to misuse our services or interfere with their proper functioning.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Intellectual Property</h2>
            <p>The service and its original content, features, and functionality are owned by RTNM Digital and are protected by international copyright, trademark, and other intellectual property laws.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Limitation of Liability</h2>
            <p>LawGens provides legal AI assistance but does not replace professional legal advice. Users should consult qualified legal professionals for specific legal matters.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
