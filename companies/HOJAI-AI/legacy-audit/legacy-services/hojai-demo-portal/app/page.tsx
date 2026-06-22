"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap, Users, Globe, Activity, MessageSquare, ShoppingBag, Heart, Building2,
  ArrowRight, Play, CheckCircle2, Sparkles, Shield, TrendingUp, Clock, MapPin
} from "lucide-react";

const stats = [
  { label: "AI Employees", value: "174", icon: Users },
  { label: "Core Platforms", value: "12", icon: Globe },
  { label: "Services", value: "66+", icon: Zap },
  { label: "Uptime", value: "99.9%", icon: Activity },
];

const features = [
  { title: "AI Employee Playground", description: "Chat with live AI agents - Support, Sales, Receptionist, HR Recruiter", icon: MessageSquare, href: "/playground", color: "from-blue-500 to-cyan-500" },
  { title: "Service Health", description: "Real-time monitoring of all 12 HOJAI Core services", icon: Activity, href: "/health", color: "from-emerald-500 to-teal-500" },
  { title: "API Explorer", description: "Interactive REST API tester with live responses", icon: Zap, href: "/api-explorer", color: "from-amber-500 to-orange-500" },
  { title: "Industry Demos", description: "Pre-built scenarios for Restaurant, Salon, Clinic, Hotel", icon: Building2, href: "/industries", color: "from-violet-500 to-purple-500" },
  { title: "Journey Stories", description: "Interactive stories showing RTNM AI in action", icon: MapPin, href: "/journeys", color: "from-pink-500 to-rose-500" },
  { title: "SUTAR OS", description: "Autonomous procurement and negotiation engine", icon: ShoppingBag, href: "/sutar-os", color: "from-indigo-500 to-blue-500" },
];

const platforms = [
  { name: "BrandPulse", port: 4770, description: "Brand Intelligence", status: "operational" },
  { name: "HIB", port: 3053, description: "Human Intelligence", status: "operational" },
  { name: "AssetMind", port: 5001, description: "Financial Intelligence", status: "operational" },
  { name: "Nexha", port: 5002, description: "Commerce Network", status: "operational" },
  { name: "RisaCare", port: 4800, description: "Healthcare Intelligence", status: "operational" },
  { name: "StayOwn", port: 4801, description: "Hospitality Intelligence", status: "operational" },
  { name: "CorpPerks", port: 4720, description: "Workforce Intelligence", status: "operational" },
  { name: "KHAIRMOVE", port: 4600, description: "Mobility Intelligence", status: "operational" },
];

export default function HomePage() {
  const [counter, setCounter] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter(c => (c + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 to-slate-900" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full text-indigo-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Interactive Demo Portal
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              HOJAI AI
            </span>
            <br />
            Demo Portal
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Experience 174 AI Employees, 12 Core Platforms, and 66+ Services working together.
            See the future of autonomous business operations.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/playground"
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              <Play className="w-5 h-5" />
              Try AI Playground
            </Link>
            <Link
              href="/journeys"
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold text-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <MapPin className="w-5 h-5" />
              View Journeys
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
                <stat.icon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Grid */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Core <span className="text-indigo-400">Platforms</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <div key={platform.name} className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{platform.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs text-slate-400 mb-1">{platform.description}</div>
                <div className="text-xs text-indigo-400">Port {platform.port}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Explore <span className="text-indigo-400">Capabilities</span>
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Interactive demos showcasing how HOJAI AI services work together in real scenarios
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/50 transition-all hover:scale-[1.02]"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{feature.description}</p>
                <div className="flex items-center gap-2 text-indigo-400 text-sm group-hover:gap-3 transition-all">
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo CTA */}
      <section className="py-20 bg-gradient-to-r from-indigo-900/50 to-purple-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Experience AI?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Start with the AI Playground to chat with live agents and see real-time responses
          </p>
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors"
          >
            <Play className="w-5 h-5" />
            Launch Playground
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          HOJAI AI Demo Portal - Powered by RTNM Ecosystem
        </div>
      </footer>
    </div>
  );
}