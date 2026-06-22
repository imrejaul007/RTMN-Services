"use client";
import { useState } from "react";
import Link from "next/link";
import { Utensils, Heart, Building2, ShoppingBag, Car, GraduationCap, ArrowRight } from "lucide-react";

const industries = [
  {
    id: "restaurant",
    name: "Restaurant",
    product: "Waitron",
    port: 4775,
    description: "AI-powered restaurant management - orders, inventory, KDS",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    features: ["Voice ordering", "Inventory AI", "KDS display", "Upsell suggestions"],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    product: "RisaCare",
    port: 4800,
    description: "Smart healthcare coordination - appointments, diagnostics, pharmacy",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    features: ["AI triage", "Health Twin", "Prescription routing", "Insurance verify"],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    product: "StayOwn",
    port: 4801,
    description: "Invisible hotel experience - zero-touch check-in, smart rooms",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    features: ["GPS room prep", "Voice control", "Auto checkout", "Preference learning"],
  },
  {
    id: "retail",
    name: "Retail",
    product: "Nexha",
    port: 5002,
    description: "Commerce network intelligence - POS, inventory, supplier discovery",
    icon: ShoppingBag,
    color: "from-emerald-500 to-teal-600",
    features: ["Smart POS", "Supplier matching", "Demand forecasting", "Multi-channel"],
  },
  {
    id: "mobility",
    name: "Mobility",
    product: "KHAIRMOVE",
    port: 4600,
    description: "Mobility intelligence - ride booking, fleet management, safety",
    icon: Car,
    color: "from-blue-500 to-cyan-600",
    features: ["Auto booking", "Fleet optimization", "Safety monitoring", "Expense tracking"],
  },
  {
    id: "education",
    name: "Education",
    product: "LearnIQ",
    port: 4703,
    description: "AI-powered learning - personalized content, progress tracking",
    icon: GraduationCap,
    color: "from-indigo-500 to-blue-600",
    features: ["Adaptive learning", "Progress analytics", "Content recommendations", "Assessment AI"],
  },
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <section className="py-16 bg-gradient-to-b from-indigo-950/50 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Industry <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Demos</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Pre-built AI solutions for Restaurant, Healthcare, Hospitality, Retail, Mobility, and Education
          </p>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {industries.map((industry) => (
              <div
                key={industry.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all group"
              >
                <div className={`h-2 bg-gradient-to-r ${industry.color}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${industry.color} flex items-center justify-center`}>
                      <industry.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded">Port {industry.port}</span>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-1">{industry.name}</h3>
                  <p className="text-sm text-indigo-400 mb-3">{industry.product}</p>
                  <p className="text-slate-400 text-sm mb-4">{industry.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {industry.features.map((feature) => (
                      <span key={feature} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/industries/${industry.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 rounded-xl text-white font-medium hover:bg-slate-600 transition-colors"
                  >
                    Try Demo <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Want a Custom Demo?</h2>
          <p className="text-slate-400 mb-6">
            Contact us to build a personalized demo for your industry
          </p>
          <a
            href="mailto:contact@hojai.ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90"
          >
            Request Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}