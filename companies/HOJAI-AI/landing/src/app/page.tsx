'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Menu, X, ArrowRight, Zap, Users, Brain, Database,
  Shield, Workflow, Globe, Building2, TrendingUp, Target, Award,
  Code, ShoppingBag, Factory, Stethoscope, Utensils, Briefcase,
  CheckCircle2, Play, Sparkles, Layers, Lock, LineChart,
  Rocket, TrendingDown, AlertTriangle, Search, Handshake, FileText,
  CreditCard, Truck, BarChart3, Clock, Quote, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// NAVIGATION
// ============================================
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Why HOJAI', href: '#usecase' },
    { label: 'Platform', href: '#platform' },
    { label: 'SUTAR OS', href: '#sutar' },
    { label: 'Marketplace', href: '#marketplace' },
    { label: 'Docs', href: '#' },
  ]

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      )}>
        <div className="container-custom flex items-center justify-between h-16 lg:h-20">
          <a href="#" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-xl font-bold text-white">HOJAI</span>
          </a>

          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Sign In
            </button>
            <button className="btn-primary text-sm py-2.5 px-5">
              Start Free
            </button>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setIsMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#030305]/98 backdrop-blur-xl lg:hidden"
          >
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-12">
                <span className="text-xl font-bold text-white">HOJAI</span>
                <button onClick={() => setIsMobileOpen(false)}><X className="w-6 h-6 text-white" /></button>
              </div>
              <div className="flex flex-col gap-6 flex-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="text-2xl font-semibold text-white"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    {link.label}
                  </motion.a>
                ))}
              </div>
              <div className="flex flex-col gap-3 mt-auto">
                <button className="btn-secondary w-full">Sign In</button>
                <button className="btn-primary w-full">Start Free</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================
// HERO SECTION
// ============================================
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-noise" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] orb-cyan opacity-60" />
      <div className="absolute bottom-1/3 right-1/4 w-[700px] h-[700px] orb-purple opacity-50" />

      <div className="container-custom relative z-10 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span className="badge">
              <span className="badge-dot" />
              Now in Public Beta — Deploy AI employees in hours
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-8"
          >
            The Operating System
            <br />
            <span className="text-gradient">For AI-Native Organizations</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl lg:text-2xl text-white/50 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Software manages functions.
            <br className="hidden sm:block" />
            <span className="text-white font-medium"> HOJAI manages organizations.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="btn-primary text-lg">
              Deploy AI Employees
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn-secondary text-lg">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </motion.div>

          {/* Trust note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-sm text-white/30"
          >
            No credit card required · Deploy in hours · Scale infinitely
          </motion.p>
        </div>

        {/* Architecture diagram */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20 lg:mt-28"
        >
          <div className="max-w-4xl mx-auto">
            <div className="card-glass p-8 lg:p-12">
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: 'CorpID', icon: Shield, color: 'cyan' },
                  { name: 'MemoryOS', icon: Brain, color: 'purple' },
                  { name: 'Knowledge', icon: Database, color: 'amber' },
                  { name: 'TwinOS', icon: Users, color: 'cyan' },
                  { name: 'FlowOS', icon: Workflow, color: 'purple' },
                  { name: 'PolicyOS', icon: Lock, color: 'amber' },
                  { name: 'SUTAR OS', icon: Globe, color: 'cyan' },
                  { name: 'Marketplace', icon: ShoppingBag, color: 'purple' },
                ].map((layer) => (
                  <div key={layer.name} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                    <layer.icon className={cn(
                      'w-4 h-4',
                      layer.color === 'cyan' && 'text-cyan-400',
                      layer.color === 'purple' && 'text-purple-400',
                      layer.color === 'amber' && 'text-amber-400'
                    )} />
                    <span className="text-sm font-medium text-white/80">{layer.name}</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-sm text-white/30">
                Applications evolve. <span className="text-white/50">Infrastructure compounds.</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// PROBLEM SECTION
// ============================================
function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const problems = [
    { title: 'Dozens of disconnected systems', description: 'CRM, ERP, HRMS, accounting, communication — all siloed with no unified view.', icon: Layers },
    { title: 'Organizational knowledge silos', description: "Critical knowledge lives in people's heads. When they leave, it leaves with them.", icon: Brain },
    { title: 'Manual processes everywhere', description: 'Teams spend more time coordinating than creating value. 50+ hours per week.', icon: Workflow },
    { title: 'AI tools without memory', description: "Every conversation starts from scratch. AI can't remember your business.", icon: Database },
    { title: 'Fragmented customer experiences', description: 'No single source of truth. Customers repeat themselves across departments.', icon: Users },
    { title: 'Growing labor constraints', description: "Can't scale without proportional headcount. Linear growth forever.", icon: TrendingUp },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">The Problem</span>
          <h2 className="section-title">
            Companies Have Software.
            <br />
            <span className="text-white/50">But Companies Are Not Programmable.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="card-feature group"
            >
              <div className="icon-box icon-box-rose mb-4">
                <problem.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{problem.title}</h3>
              <p className="text-sm text-white/50">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl gradient-bg-subtle border border-white/10">
            <span className="text-white/60">Traditional software</span>
            <ArrowRight className="w-5 h-5 text-white/30" />
            <span className="text-gradient font-semibold text-lg">HOJAI digitizes organizations</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// WHY NOW SECTION
// ============================================
function WhyNow() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const shifts = [
    { title: 'Intelligence', description: 'AI systems are finally capable of executing meaningful business work with 90%+ accuracy.', stat: '90%+', statLabel: 'AI Accuracy', icon: Brain, color: 'cyan' },
    { title: 'Workforce Change', description: 'Organizations need to scale faster than traditional hiring allows.', stat: '40%', statLabel: 'Labor Cost Increase', icon: Users, color: 'purple' },
    { title: 'Software Complexity', description: 'Businesses are overwhelmed by fragmented tools. Average company uses 80+ SaaS apps.', stat: '80+', statLabel: 'SaaS Apps Per Company', icon: Layers, color: 'amber' },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#0a0a0f]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">Why Now</span>
          <h2 className="section-title">Three Shifts Are Converging</h2>
          <p className="section-subtitle mx-auto">The next generation of companies will be</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {shifts.map((shift, i) => (
            <motion.div
              key={shift.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="card-feature text-center"
            >
              <div className={cn('icon-box icon-box-lg mx-auto mb-6', `icon-box-${shift.color}`)}>
                <shift.icon className="w-6 h-6" />
              </div>
              <div className={cn('text-4xl font-bold mb-1', `text-${shift.color}-400`)}>
                {shift.stat}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-4">{shift.statLabel}</div>
              <h3 className="text-xl font-bold text-white mb-3">{shift.title}</h3>
              <p className="text-sm text-white/50">{shift.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="inline-block p-8 rounded-2xl gradient-bg-subtle border border-white/10">
            <p className="text-white/60 mb-4">The next generation of companies will be:</p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Memory-native', 'AI-first', 'Autonomous by design'].map((trait) => (
                <span key={trait} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-medium">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// USE CASE: RESTAURANT
// ============================================
function UseCaseRestaurant() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const before = [
    { label: 'Procurement Time', value: '15 hrs/week', icon: Clock },
    { label: 'Supplier Costs', value: '+25%', icon: TrendingUp },
    { label: 'Staff Required', value: '8 people', icon: Users },
    { label: 'Operating Hours', value: '9am-9pm', icon: Building2 },
  ]

  const after = [
    { label: 'Procurement Time', value: '0 hrs/week', icon: Clock },
    { label: 'Supplier Costs', value: '-18%', icon: TrendingDown },
    { label: 'Staff Required', value: '3 people', icon: Users },
    { label: 'Operating Hours', value: '24/7', icon: Building2 },
  ]

  const sutars = [
    { label: 'AI detects low inventory', icon: AlertTriangle },
    { label: 'Identifies best suppliers', icon: Search },
    { label: 'Negotiates price & terms', icon: Handshake },
    { label: 'Generates smart contract', icon: FileText },
    { label: 'Auto-orders & tracks', icon: Truck },
  ]

  return (
    <section id="usecase" ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow text-amber-400">Use Case</span>
          <h2 className="section-title">
            Restaurant Saves 40% on Procurement
            <br />
            <span className="text-white/50">in 30 Minutes</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="card-glass p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-box icon-box-rose">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-rose-400 text-sm font-semibold">BEFORE</span>
                <h3 className="text-lg font-bold text-white">Manual Operations</h3>
              </div>
            </div>
            <div className="space-y-4">
              {before.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-rose-400" />
                    <span className="text-white/60">{item.label}</span>
                  </div>
                  <span className="text-lg font-bold text-rose-400">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card-glass p-8 border-cyan-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-box icon-box-cyan">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-cyan-400 text-sm font-semibold">AFTER</span>
                <h3 className="text-lg font-bold text-white">AI Autonomous</h3>
              </div>
            </div>
            <div className="space-y-4">
              {after.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white/60">{item.label}</span>
                  </div>
                  <span className="text-lg font-bold text-cyan-400">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* SUTAR flow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h3 className="text-xl font-bold text-white mb-8">How SUTAR OS Handles Procurement</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {sutars.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <step.icon className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-white/70">{step.label}</span>
                </div>
                {i < sutars.length - 1 && <ChevronRight className="w-5 h-5 text-white/20" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// SUTAR OS SECTION
// ============================================
function SutarOS() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const features = [
    { title: 'Autonomous Procurement', description: 'AI monitors inventory, discovers suppliers, negotiates terms, and places orders automatically.', icon: ShoppingBag, color: 'cyan' },
    { title: 'Supplier Discovery', description: 'Access the Global Nexha network of verified suppliers.', icon: Search, color: 'purple' },
    { title: 'Smart Negotiation', description: 'AI agents negotiate price, quantity, delivery terms autonomously.', icon: Handshake, color: 'amber' },
    { title: 'Contract Generation', description: 'Automatically generate legally-binding contracts.', icon: FileText, color: 'emerald' },
    { title: 'Payment Settlement', description: 'Integrated escrow. Funds released only when terms are met.', icon: CreditCard, color: 'rose' },
    { title: 'Real-time Tracking', description: 'End-to-end visibility of orders and deliveries.', icon: Truck, color: 'cyan' },
  ]

  const flow = [
    { step: 1, label: 'Inventory drops below threshold', icon: AlertTriangle },
    { step: 2, label: 'AI detects shortage', icon: Brain },
    { step: 3, label: 'Suppliers identified via Nexha', icon: Search },
    { step: 4, label: 'Options evaluated', icon: BarChart3 },
    { step: 5, label: 'Recommendations generated', icon: Target },
    { step: 6, label: 'Approval or auto-execute', icon: CheckCircle2 },
  ]

  return (
    <section id="sutar" ref={ref} className="section-padding relative bg-[#0a0a0f]">
      <div className="absolute inset-0 bg-grid opacity-50" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="eyebrow">SUTAR OS</span>
            <h2 className="section-title">
              Autonomous Commerce
              <br />
              <span className="text-gradient">For Every Business</span>
            </h2>
            <p className="text-lg text-white/50 mb-8">
              SUTAR OS handles the entire procurement and commerce lifecycle automatically.
              From detecting needs to negotiating deals to settling payments.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <feature.icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', `text-${feature.color}-400`)} />
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-white/40">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Flow visualization */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-l from-cyan-500/5 to-purple-500/5 rounded-3xl blur-3xl" />
            <div className="relative card-glass p-8">
              <h3 className="text-lg font-semibold text-white mb-6 text-center">The Autonomous Flow</h3>
              <div className="space-y-4">
                {flow.map((step, i) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {step.step}
                      </span>
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-sm text-white/70">{step.label}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// SOCIAL PROOF
// ============================================
function SocialProof() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const stats = [
    { value: '50+', label: 'Companies Deployed' },
    { value: '300+', label: 'AI Agents Active' },
    { value: '47%', label: 'Avg Cost Reduction' },
    { value: '99.9%', label: 'Uptime SLA' },
  ]

  const testimonials = [
    { quote: "We reduced procurement costs by 40% in the first month. The AI handles supplier discovery and negotiation automatically.", author: "Rajesh Kumar", role: "Founder", company: "Biryani House" },
    { quote: "Our HR team now handles 3x more employees with half the staff. AI does the screening, scheduling, and compliance.", author: "Priya Sharma", role: "COO", company: "RetailMart India" },
    { quote: "Patient follow-ups went from manual calls to automated AI conversations. Satisfaction scores up 35%.", author: "Dr. Amit Patel", role: "Medical Director", company: "HealthPlus Clinics" },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="card-metric"
            >
              <div className="text-3xl lg:text-4xl font-bold text-gradient mb-1">{stat.value}</div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-center text-white/40 text-sm uppercase tracking-widest mb-8">What Our Customers Say</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                className="card-feature"
              >
                <Quote className="w-8 h-8 text-cyan-400/30 mb-4" />
                <p className="text-white/80 mb-6 leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{t.author.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{t.author}</div>
                    <div className="text-xs text-white/40">{t.role}, {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-white/30 text-sm uppercase tracking-widest mb-6">Trusted by growing companies</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Biryani House', 'RetailMart', 'HealthPlus', 'HotelGroup', 'LogiCorp', 'ProfServices'].map((name) => (
              <div key={name} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Building2 className="w-4 h-4 text-white/40" />
                <span className="text-sm font-medium text-white/40">{name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// PLATFORM SECTION
// ============================================
function Platform() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const layers = [
    { name: 'Leadership Intelligence', desc: 'Strategic decision making & planning', icon: Award, color: 'amber' },
    { name: 'Marketing Intelligence', desc: 'Campaigns, content, audience', icon: Target, color: 'purple' },
    { name: 'Sales Intelligence', desc: 'Pipeline, forecasting, closing', icon: TrendingUp, color: 'cyan' },
    { name: 'Finance Intelligence', desc: 'Budgets, accounting, compliance', icon: LineChart, color: 'emerald' },
    { name: 'Talent Intelligence', desc: 'Recruitment, performance, growth', icon: Users, color: 'rose' },
    { name: 'Operations Intelligence', desc: 'Processes, resources, quality', icon: Workflow, color: 'amber' },
    { name: 'Procurement Intelligence', desc: 'Suppliers, sourcing, contracts', icon: ShoppingBag, color: 'purple' },
    { name: 'Customer Intelligence', desc: 'Success, support, retention', icon: Award, color: 'cyan' },
    { name: 'Developer Platform', desc: 'SDKs, APIs, integrations', icon: Code, color: 'emerald' },
  ]

  return (
    <section id="platform" ref={ref} className="section-padding relative bg-[#0a0a0f]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">The Platform</span>
          <h2 className="section-title">
            One Platform.
            <br />
            <span className="text-gradient">Every Department.</span>
          </h2>
          <p className="section-subtitle mx-auto">One organization. One intelligence layer.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="card-feature"
            >
              <div className={cn('icon-box mb-4', `icon-box-${layer.color}`)}>
                <layer.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-1">{layer.name}</h3>
              <p className="text-sm text-white/50">{layer.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// DEPARTMENTS SECTION
// ============================================
function Departments() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const departments = [
    { name: 'Sales', icon: TrendingUp, color: 'cyan', agents: ['Lead Scoring', 'Opportunity Intel', 'Churn Prediction', 'Pricing Optimizer', 'Auto Follow-up'] },
    { name: 'Marketing', icon: Target, color: 'purple', agents: ['Campaign Strategist', 'Content Generator', 'SEO Advisor', 'Budget Allocator', 'ROI Calculator'] },
    { name: 'Finance', icon: LineChart, color: 'emerald', agents: ['Invoice Processing', 'Expense Analysis', 'Budget Planning', 'Compliance Check', 'Forecast Engine'] },
    { name: 'HR', icon: Users, color: 'amber', agents: ['Resume Screening', 'Interview Scheduler', 'Leave Approval', 'Performance Analyzer', 'Attrition Predictor'] },
    { name: 'Operations', icon: Workflow, color: 'rose', agents: ['Process Optimizer', 'Incident Manager', 'Risk Predictor', 'Quality Control', 'Resource Allocator'] },
    { name: 'Customer Success', icon: Award, color: 'cyan', agents: ['Health Score', 'Churn Predictor', 'NPS Insights', 'Onboarding Optimizer', 'Expansion Advisor'] },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">AI Workforce</span>
          <h2 className="section-title">
            Deploy AI Departments.
            <br />
            <span className="text-gradient">Not Just Tools.</span>
          </h2>
          <p className="section-subtitle mx-auto">
            Organizations deploy entire departments instead of individual tools. Deploy in hours. Not months.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept, i) => (
            <motion.div
              key={dept.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="card-feature"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={cn('icon-box', `icon-box-${dept.color}`)}>
                  <dept.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                  <span className="text-xs text-white/40">{dept.agents.length} AI agents</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dept.agents.map((agent) => (
                  <span key={agent} className="px-3 py-1 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/60">
                    {agent}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// MARKETPLACE SECTION
// ============================================
function Marketplace() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const categories = ['AI Employees', 'Department OS', 'Industry Packs', 'Skills', 'Workflows', 'Digital Twins', 'Memory Packs', 'Policy Packs', 'Integrations', 'MCP Servers', 'Blueprints', 'Starter Kits']

  return (
    <section id="marketplace" ref={ref} className="section-padding relative bg-[#0a0a0f]">
      <div className="absolute inset-0 bg-grid opacity-50" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="eyebrow">Developer Platform</span>
            <h2 className="section-title">
              Build. Deploy.
              <br />
              <span className="text-gradient">Monetize.</span>
            </h2>
            <p className="text-lg text-white/50 mb-8">
              Developers build with Agent SDK, Memory SDK, Twin SDK, Workflow SDK, and Marketplace APIs.
              Businesses deploy rapidly. The platform grows through ecosystem participation.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {['Agent SDK', 'Memory SDK', 'Twin SDK', 'Workflow SDK', 'Marketplace APIs'].map((sdk) => (
                <span key={sdk} className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm font-medium text-white/70">
                  {sdk}
                </span>
              ))}
            </div>
            <button className="btn-primary">
              Explore Marketplace
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-l from-cyan-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
            <div className="relative card-glass p-8">
              <h3 className="text-lg font-semibold text-white mb-6">1,200+ Marketplace Items</h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map((cat, i) => (
                  <span key={cat} className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/60">
                    {cat}
                  </span>
                ))}
              </div>
              <div className="pt-6 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gradient">1,200+</div>
                    <div className="text-xs text-white/40 mt-1">Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gradient">15+</div>
                    <div className="text-xs text-white/40 mt-1">Categories</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gradient">70%</div>
                    <div className="text-xs text-white/40 mt-1">Built</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// MOATS SECTION
// ============================================
function Moats() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const moats = [
    { name: 'Identity', icon: Shield },
    { name: 'Memory', icon: Brain },
    { name: 'Knowledge', icon: Database },
    { name: 'Twins', icon: Users },
    { name: 'Agents', icon: Workflow },
    { name: 'Commerce', icon: ShoppingBag },
    { name: 'Economics', icon: Globe },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">Competitive Moat</span>
          <h2 className="section-title">The Seven Network Moats</h2>
          <p className="section-subtitle mx-auto">The value compounds as organizations grow.</p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="card-glass p-8 lg:p-12"
          >
            <div className="flex flex-wrap justify-center gap-4">
              {moats.map((moat, i) => (
                <motion.div
                  key={moat.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-colors"
                >
                  <moat.icon className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium text-white/80">{moat.name}</span>
                </motion.div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-white/40">
              Each layer compounds the value of the layers above it.
              <br />
              <span className="text-white/60">Applications evolve. Infrastructure compounds.</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// FLYWHEEL SECTION
// ============================================
function Flywheel() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const stages = [
    { label: 'More Companies', icon: Building2 },
    { label: 'More Memory', icon: Brain },
    { label: 'Smarter Twins', icon: Users },
    { label: 'Better Agents', icon: Workflow },
    { label: 'Better Outcomes', icon: TrendingUp },
    { label: 'More Developers', icon: Code },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#0a0a0f]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">The Flywheel</span>
          <h2 className="section-title">
            Growth Compounds.
            <br />
            <span className="text-gradient">Value Accumulates.</span>
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stages.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="card-metric"
              >
                <stage.icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                <span className="text-sm font-medium text-white/80">{stage.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// INDUSTRY SECTION
// ============================================
function Industry() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const phases = [
    { phase: 'Phase 1', name: 'CompanyOS', desc: 'Core infrastructure for any organization', completed: true },
    { phase: 'Phase 2', name: 'IndustryOS', desc: 'Restaurant, Healthcare, Retail, Hospitality, Logistics', completed: false },
    { phase: 'Phase 3', name: 'NetworkOS', desc: 'Cross-company intelligence & collaboration', completed: false },
    { phase: 'Phase 4', name: 'Autonomous Commerce', desc: 'AI-to-AI procurement, negotiation & settlement', completed: false },
  ]

  const industries = [
    { name: 'Restaurant', icon: Utensils, color: 'amber' },
    { name: 'Healthcare', icon: Stethoscope, color: 'rose' },
    { name: 'Retail', icon: ShoppingBag, color: 'purple' },
    { name: 'Hospitality', icon: Building2, color: 'cyan' },
    { name: 'Logistics', icon: Factory, color: 'emerald' },
    { name: 'Professional', icon: Briefcase, color: 'amber' },
  ]

  return (
    <section ref={ref} className="section-padding relative bg-[#050507]">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="eyebrow">Expansion Strategy</span>
          <h2 className="section-title">
            Build Once.
            <br />
            <span className="text-gradient">Scale Across Industries.</span>
          </h2>
        </motion.div>

        {/* Phases */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-amber-500" />
            <div className="space-y-6">
              {phases.map((p, i) => (
                <motion.div
                  key={p.phase}
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="relative pl-16"
                >
                  <div className={cn(
                    'absolute left-0 w-12 h-12 rounded-xl flex items-center justify-center',
                    p.completed ? 'bg-gradient-to-br from-cyan-500 to-purple-500' : 'bg-white/10 border border-white/20'
                  )}>
                    {p.completed ? <CheckCircle2 className="w-6 h-6 text-white" /> : <span className="text-sm font-bold text-white/60">{i + 1}</span>}
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-white/40">{p.phase}</span>
                      {p.completed && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Live</span>}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                    <p className="text-sm text-white/50">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Industries */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-white/60 mb-6">Initial Industry Focus</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((ind) => (
              <div key={ind.name} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/10">
                <ind.icon className={cn('w-5 h-5', `text-${ind.color}-400`)} />
                <span className="font-medium text-white/80">{ind.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// CTA SECTION
// ============================================
function CTA() {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-[#050507]" />
      <div className="absolute inset-0 gradient-bg-cta" />

      <div className="container-custom relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title text-4xl sm:text-5xl lg:text-6xl mb-6">
              Every Company.
              <br />
              Every Department.
              <br />
              <span className="text-gradient">One Platform.</span>
            </h2>
            <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
              The next generation of organizations will be Memory-native, AI-powered, and Autonomous.
              <br />
              <span className="text-white/70">HOJAI provides the operating system.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary text-lg">
                Start Building Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="btn-secondary text-lg">
                Schedule Demo
              </button>
            </div>
            <p className="mt-8 text-sm text-white/30">
              No credit card required · Deploy in hours · Scale infinitely
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Docs', 'Changelog'],
    Developers: ['SDK', 'API Reference', 'GitHub', 'Discord'],
    Company: ['About', 'Blog', 'Careers', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
  }

  return (
    <footer className="py-16 border-t border-white/5">
      <div className="container-custom">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <span className="text-xl font-bold text-white">HOJAI</span>
            </a>
            <p className="text-sm text-white/40 mb-4">
              The Operating System For AI-Native Organizations.
            </p>
          </div>
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/30">© 2026 HOJAI AI. All rights reserved.</p>
          <p className="text-sm text-white/30">Raising $2M Seed Round</p>
        </div>
      </div>
    </footer>
  )
}

// ============================================
// MAIN PAGE
// ============================================
export default function Home() {
  return (
    <main className="bg-[#030305] min-h-screen">
      <Navigation />
      <Hero />
      <Problem />
      <WhyNow />
      <UseCaseRestaurant />
      <SutarOS />
      <Platform />
      <Departments />
      <Moats />
      <Flywheel />
      <Marketplace />
      <Industry />
      <SocialProof />
      <CTA />
      <Footer />
    </main>
  )
}
