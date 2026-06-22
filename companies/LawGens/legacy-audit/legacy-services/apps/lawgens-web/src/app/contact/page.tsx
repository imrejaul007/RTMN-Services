'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">L</div>
          <span className="text-xl font-semibold">LawGens</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-6 text-center">Contact Us</h1>
        <p className="text-slate-400 text-center mb-12">We'd love to hear from you. Send us a message!</p>

        <form className="bg-slate-800 rounded-xl p-8 border border-slate-700 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3" placeholder="How can we help?" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} rows={5} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 resize-none" placeholder="Your message..." />
          </div>
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 py-3 rounded-lg font-medium">Send Message</button>
        </form>

        <div className="mt-12 text-center text-slate-400">
          <p>Email: support@lawgens.app</p>
          <p>Phone: +91 12345 67890</p>
        </div>
      </main>
    </div>
  );
}
