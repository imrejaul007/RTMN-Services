'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    company: 'Acme Corp',
    plan: 'Professional',
    joined: 'January 2026',
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white">← Back</a>
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center font-bold">L</div>
          <span className="text-lg font-semibold">My Profile</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-4xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-slate-400">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">{profile.plan} Plan</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">24</div>
              <div className="text-sm text-slate-400">Contracts</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">18</div>
              <div className="text-sm text-slate-400">Active</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">Jan 2026</div>
              <div className="text-sm text-slate-400">Member Since</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input type="email" value={profile.email} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone</label>
                <input type="tel" value={profile.phone} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Company</label>
                <input type="text" value={profile.company} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2" />
              </div>
            </div>
            <button className="bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-lg font-medium">Save Changes</button>
          </div>
        </div>
      </main>
    </div>
  );
}
