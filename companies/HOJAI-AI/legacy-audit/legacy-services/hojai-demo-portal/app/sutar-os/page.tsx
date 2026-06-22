"use client";
import { useState, useEffect } from "react";
import { Zap, ArrowRight, CheckCircle2, Target, Globe, Shield, TrendingUp, FileText, Truck } from "lucide-react";

const components = [
  { name: "GoalOS", port: 4152, description: "Objective decomposition", icon: Target, status: "operational" },
  { name: "Intent Bus", port: 4154, description: "Event-driven messaging", icon: Zap, status: "operational" },
  { name: "Discovery", port: 4147, description: "Supplier finding", icon: Globe, status: "operational" },
  { name: "PolicyOS", port: 4161, description: "Compliance verification", icon: Shield, status: "operational" },
  { name: "Negotiation", port: 4159, description: "Term negotiation", icon: TrendingUp, status: "operational" },
  { name: "ContractOS", port: 4144, description: "Contract generation", icon: FileText, status: "operational" },
  { name: "Fulfillment", port: 4167, description: "Order tracking", icon: Truck, status: "operational" },
];

const workflowSteps = [
  { name: "Goal Set", status: "completed", detail: "Increase profit 15%" },
  { name: "Simulation", status: "completed", detail: "50+ scenarios tested" },
  { name: "Policy Check", status: "completed", detail: "RABTUL + Axom verified" },
  { name: "Supplier Discovery", status: "completed", detail: "3 suppliers found" },
  { name: "Negotiation", status: "active", detail: "Terms being negotiated" },
  { name: "Contract", status: "pending", detail: "Awaiting agreement" },
  { name: "Delivery", status: "pending", detail: "Scheduled for 6 AM" },
];

export default function SutarPage() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % workflowSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <section className="py-12 bg-gradient-to-b from-indigo-950/50 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full text-indigo-300 text-sm mb-4">
            <Zap className="w-4 h-4" />
            Autonomous Procurement Engine
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            SUTAR <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">OS</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From goal to delivery - watch AI agents negotiate, contract, and fulfill orders without human intervention.
          </p>
        </div>
      </section>

      {/* Live Workflow */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            Live Procurement Workflow
          </h2>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Current Order: Tomatoes</h3>
                <p className="text-slate-400">200kg @ ₹35/kg = ₹7,000</p>
              </div>
              <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                Cycle Time: 4h 23m
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-4">
              {workflowSteps.map((step, i) => (
                <div key={step.name} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      step.status === "completed" ? "bg-emerald-500" :
                      step.status === "active" ? "bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/50" :
                      "bg-slate-700"
                    }`}>
                      {step.status === "completed" ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : step.status === "active" ? (
                        <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                      ) : (
                        <span className="text-white font-semibold">{i + 1}</span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-medium text-white whitespace-nowrap">{step.name}</div>
                      <div className="text-xs text-slate-400">{step.detail}</div>
                    </div>
                  </div>
                  {i < workflowSteps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      step.status === "completed" ? "bg-emerald-500" : "bg-slate-700"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="py-12 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6">SUTAR Components</h2>
          <div className="grid lg:grid-cols-3 gap-4">
            {components.map((comp) => (
              <div
                key={comp.name}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <comp.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{comp.name}</h3>
                    <span className="text-xs text-indigo-400">Port {comp.port}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">{comp.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-emerald-400">Operational</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Try SUTAR in Action</h2>
          <p className="text-slate-400 mb-6">
            Visit the Journey Stories to see a complete procurement flow from start to finish
          </p>
          <a
            href="/journeys"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90"
          >
            View Journey Stories <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}