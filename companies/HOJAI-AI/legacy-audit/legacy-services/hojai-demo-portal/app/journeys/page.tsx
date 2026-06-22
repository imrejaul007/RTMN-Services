"use client";
import { useState } from "react";
import { Play, ArrowRight, CheckCircle2, Hotel, Utensils, ShoppingBag, Heart, Building2, Users, Sparkles, Zap, Shield, Target, TrendingUp, Clock, MapPin, MessageSquare } from "lucide-react";

const journeys = [
  {
    id: "invisible-hotel",
    title: "The Invisible Hotel",
    subtitle: "StayOwn by RTNM",
    icon: Hotel,
    color: "from-violet-500 to-purple-600",
    description: "A guest arrives at a hotel where everything just works. No check-in lines, no key cards, no checkout hassle. Powered by RTNM ecosystem.",
    steps: [
      { time: "Day before", phase: "Pre-Arrival", action: "Guest books via RIDZA", detail: "RABTUL Auth validates guest. Booking confirmed via RABTUL Notification (SMS/Email). StayOwn collects preferences: pillow type, dietary needs.", icon: MessageSquare },
      { time: "Day of", phase: "Arrival", action: "GPS triggers room prep", detail: "StayOwn detects proximity via Axom location services. AC pre-cooled, lights at preferred brightness, welcome snacks placed.", icon: MapPin },
      { time: "11:00 AM", phase: "Check-In", action: "Zero-touch check-in", detail: "Smart lock activates via RABTUL IoT integration. Guest walks to room 305. Phone buzzes: 'Welcome! Room is ready.'", icon: Building2 },
      { time: "11:05 AM", phase: "First Order", action: "Voice command: 'Order breakfast'", detail: "HOJAI Voice AI (4850) processes command. RABTUL Payment pre-authorizes. Nexha dispatches to hotel kitchen.", icon: Utensils },
      { time: "Throughout", phase: "Stay", action: "AI learns & anticipates", detail: "Genie (4703) learns preferences: extra napkins, late breakfast. Next visit auto-stocked. StayOwn analytics optimize services.", icon: Sparkles },
      { time: "11:00 AM", phase: "Checkout", action: "Zero checkout", detail: "RABTUL Payment auto-charges card. Smart lock revoked. Review requested via Nexha. Genie logs for next visit.", icon: CheckCircle2 },
    ],
    stats: [
      { label: "Check-in Time", value: "0 sec" },
      { label: "Guest Satisfaction", value: "98%" },
      { label: "Operational Cost", value: "-40%" },
    ],
    services: ["StayOwn (4801)", "RABTUL Auth (4002)", "RABTUL Payment (4001)", "HOJAI Voice AI (4850)", "Nexha (5002)", "Genie (4703)", "Axom (4050)"],
  },
  {
    id: "tomato-story",
    title: "The Tomato Story",
    subtitle: "Waitron Restaurant AI",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    description: "How HOJAI AI agents automatically restocked a restaurant's kitchen at 6 AM - negotiating with suppliers while the chef slept.",
    steps: [
      { time: "12:30 PM", phase: "Order", action: "Customer orders pasta", detail: "Waitron receives 15 orders simultaneously via Nexha POS. KDS shows all tickets. Kitchen display updated in real-time.", icon: Utensils },
      { time: "12:45 PM", phase: "Alert", action: "Tomatoes running low", detail: "Waitron Inventory Agent detects: 200g remaining, 3 more pasta orders pending. Publishes to SUTAR Intent Bus (4154).", icon: Target },
      { time: "12:46 PM", phase: "Intent", action: "Publishes to SUTAR Bus", detail: "Intent: 'Procure 200kg tomatoes, budget ₹8,000, deliver by 6 AM.' SUTAR Discovery Engine (4147) activated.", icon: Zap },
      { time: "12:47 PM", phase: "Discovery", action: "SUTAR finds suppliers", detail: "Nexha discovers suppliers: Fresh Farms (Trust: 92, ₹35/kg) and AgriCorp (Trust: 78, ₹32/kg). Verified via Axom Trust.", icon: Building2 },
      { time: "12:48 PM", phase: "Negotiation", action: "Terms agreed", detail: "SUTAR Negotiation Engine (4159) negotiates: ₹35/kg × 200kg = ₹7,000. Under budget. Contract prepared.", icon: TrendingUp },
      { time: "6:00 AM", phase: "Delivery", action: "Tomatoes arrive fresh", detail: "KHAIRMOVE (4600) schedules delivery. SUTAR Contract (4144) auto-executed. RABTUL Payment released escrow.", icon: CheckCircle2 },
    ],
    stats: [
      { label: "Time to Procure", value: "11 hours" },
      { label: "Savings", value: "₹3,000" },
      { label: "Downtime", value: "0 mins" },
    ],
    services: ["Waitron (4775)", "Nexha (5002)", "SUTAR Intent Bus (4154)", "SUTAR Discovery (4147)", "SUTAR Contract (4144)", "Axom Trust (4050)", "KHAIRMOVE (4600)"],
  },
  {
    id: "karim-day",
    title: "Karim's Day with RTNM",
    subtitle: "CEO's AI-Powered Day",
    icon: Users,
    color: "from-blue-500 to-cyan-600",
    description: "A day in the life of a CEO where every decision is augmented by AI agents working together seamlessly across the RTNM ecosystem.",
    steps: [
      { time: "9:30 AM", phase: "Strategy", action: "Revenue goal set", detail: "'Increase revenue 15% this quarter.' HOJAI CoPilot analyzes data. GoalOS decomposes into Marketing, Sales, Retention agents.", icon: Target },
      { time: "12:00 PM", phase: "Lunch", action: "Restaurant lunch", detail: "Waitron takes order. Nexha POS processes payment via RABTUL. Inventory Agent detects low stock, SUTAR Bus, Supplier negotiation.", icon: Utensils },
      { time: "3:00 PM", phase: "Finance", action: "Investment decision", detail: "AssetMind (5001) analyzes market data. SimulationOS tests 50+ scenarios. Decision Engine recommends franchise expansion.", icon: TrendingUp },
      { time: "5:00 PM", phase: "Healthcare", action: "Patient monitoring", detail: "RisaCare (4800) Health Twin detects irregular vitals. MyRisa app alerts. Nexha finds specialist via KHAIRMOVE.", icon: Heart },
      { time: "6:30 PM", phase: "Travel", action: "Ride booked automatically", detail: "Genie (4703) learns destination. KHAIRMOVE (4600) confirms driver. CorpPerks (4720) tracks expense for reimbursement.", icon: MapPin },
      { time: "11:00 PM", phase: "Rest", action: "Genie briefing ready", detail: "RiderCircle (REZ) logs ride memories. Tomorrow's agenda compiled from CorpPerks. All apps synced via HOJAI Memory (4520).", icon: Sparkles },
    ],
    stats: [
      { label: "Decisions Today", value: "47" },
      { label: "AI-Assisted", value: "43" },
      { label: "Time Saved", value: "4 hrs" },
    ],
    services: ["HOJAI CoPilot", "Waitron (4775)", "AssetMind (5001)", "Nexha (5002)", "RisaCare (4800)", "KHAIRMOVE (4600)", "Genie (4703)", "CorpPerks (4720)"],
  },
  {
    id: "autonomous-procurement",
    title: "Autonomous Procurement",
    subtitle: "SUTAR OS Demo",
    icon: ShoppingBag,
    color: "from-emerald-500 to-teal-600",
    description: "From goal to delivery: watch how SUTAR OS coordinates AI agents to negotiate, contract, and fulfill orders without human intervention.",
    steps: [
      { time: "Step 1", phase: "Goal", action: "Increase profit 15%", detail: "GoalOS (4152) receives objective. Decomposes: Reduce costs, Improve terms, Minimize waste. Strategy assigned to agents.", icon: Target },
      { time: "Step 2", phase: "Simulate", action: "Test scenarios", detail: "SUTAR SimulationOS (4164) models 50+ procurement scenarios. Identifies: Restaurant inventory = biggest cost variable (32%).", icon: Building2 },
      { time: "Step 3", phase: "Policy", action: "Compliance check", detail: "SUTAR PolicyOS (4161) verifies: Budget approved (RABTUL), suppliers vetted (Axom Trust), RBI compliance.", icon: Shield },
      { time: "Step 4", phase: "Discover", action: "Find best suppliers", detail: "Nexha (5002) discovers suppliers. Trust scores verified via Axom. RABTUL Credit checks payment history.", icon: Zap },
      { time: "Step 5", phase: "Negotiate", action: "Terms agreed", detail: "SUTAR Negotiation Engine (4159) negotiates with 3 suppliers. Best terms: 18% discount + net-30 payment.", icon: TrendingUp },
      { time: "Step 6", phase: "Contract", action: "Signed & delivered", detail: "SUTAR ContractOS (4144) auto-generates agreement. RABTUL Escrow (4001) funds payment. KHAIRMOVE schedules delivery.", icon: CheckCircle2 },
    ],
    stats: [
      { label: "Cycle Time", value: "4 hrs" },
      { label: "Human Touches", value: "0" },
      { label: "Cost Reduction", value: "23%" },
    ],
    services: ["SUTAR GoalOS (4152)", "SUTAR SimulationOS (4164)", "SUTAR PolicyOS (4161)", "Nexha (5002)", "Axom Trust (4050)", "RABTUL (4001-4005)", "SUTAR Contract (4144)", "KHAIRMOVE (4600)"],
  },
  {
    id: "healthcare-journey",
    title: "Smart Healthcare",
    subtitle: "RisaCare & MyRisa",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    description: "From symptom to solution: how RisaCare coordinates care across doctors, pharmacies, and insurance seamlessly.",
    steps: [
      { time: "8:00 AM", phase: "Check-In", action: "AI triages symptoms", detail: "MyRisa app logs: 'Chest pain for 2 days.' RisaCare AI (4800) assesses urgency: Moderate, Schedule today.", icon: Heart },
      { time: "8:30 AM", phase: "Consultation", action: "Doctor AI assists", detail: "Dr. Sharma reviews AI summary. RisaCare Human Twin (4824) shows health history. ECG suggested. RABTUL insurance verified.", icon: Users },
      { time: "9:00 AM", phase: "Diagnostics", action: "Results in 30 mins", detail: "ECG completed. RisaCare (4800) compares with 10,000 cases. Minor issue detected. MyRisa updates health score.", icon: Target },
      { time: "9:30 AM", phase: "Prescription", action: "Sent to preferred pharmacy", detail: "Nexha (5002) pharmacy network confirms: 'Medicine ready in 20 mins.' RIDZA (Finance) verifies insurance coverage.", icon: ShoppingBag },
      { time: "10:00 AM", phase: "Follow-Up", action: "Genie sets reminder", detail: "Genie (4703) schedules: 'Take medication after food.' RisaCare consultation copilot prepares follow-up questions.", icon: Sparkles },
      { time: "Ongoing", phase: "Prevention", action: "Predictive care", detail: "MyRisa Human Twin learns patterns. Alerts: 'Sleep quality down 20%.' Wellness agents recommend stress check.", icon: Shield },
    ],
    stats: [
      { label: "Time to Treatment", value: "90 min" },
      { label: "Insurance Verified", value: "100%" },
      { label: "Prevention Score", value: "94%" },
    ],
    services: ["RisaCare (4800)", "MyRisa App (4900)", "RisaCare Twin (4824)", "Nexha (5002)", "Genie (4703)", "RABTUL Auth (4002)", "RIDZA (6000)"],
  },
  {
    id: "spiceroute",
    title: "SpiceRoute Restaurant",
    subtitle: "Waitron AI Demo",
    icon: Utensils,
    color: "from-red-500 to-pink-600",
    description: "A busy restaurant's AI-powered lunch rush where every order, inventory check, and customer interaction is handled by Waitron.",
    steps: [
      { time: "12:00 PM", phase: "Lunch Rush", action: "15 orders, 3 staff", detail: "Waitron (4775) handles phone orders. Nexha POS displays 15 tickets. Kitchen efficiency: +40%. BrandPulse (4770) monitors reviews.", icon: Utensils },
      { time: "12:30 PM", phase: "Low Stock", action: "Tomatoes running out", detail: "Waitron Inventory Agent alerts: '200g remaining.' Intent published to SUTAR Bus. Nexha tracks supplier leads.", icon: Target },
      { time: "1:00 PM", phase: "Upsell", action: "AI suggests add-ons", detail: "Waitron CoPilot analyzes order: 'Customers who ordered biryani loved garlic bread!' 30% order value increase.", icon: TrendingUp },
      { time: "1:30 PM", phase: "Review", action: "5-star review posted", detail: "BrandPulse (4770) detects positive sentiment: 'Amazing biryani!' Genie (4703) logs customer preference for next visit.", icon: MessageSquare },
      { time: "6:00 PM", phase: "Evening Prep", action: "New supplier delivers", detail: "SUTAR Contract fulfilled. RABTUL Payment released. Fresh tomatoes arrive. Nexha logs delivery confirmation.", icon: CheckCircle2 },
      { time: "9:00 PM", phase: "Insights", action: "Daily report generated", detail: "AssetMind (5001) generates report: Top dish: Biryani (87 orders). Peak hour: 1-2 PM. Inventory reorder triggered.", icon: Sparkles },
    ],
    stats: [
      { label: "Orders Today", value: "234" },
      { label: "Revenue", value: "₹1.2L" },
      { label: "No Stockouts", value: "100%" },
    ],
    services: ["Waitron (4775)", "Nexha (5002)", "BrandPulse (4770)", "SUTAR Bus (4154)", "RABTUL (4001)", "Genie (4703)", "AssetMind (5001)"],
  },
];

export default function JourneysPage() {
  const [selectedJourney, setSelectedJourney] = useState(journeys[0]);
  const [activeStep, setActiveStep] = useState(-1);

  const playJourney = () => {
    setActiveStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= selectedJourney.steps.length) {
        clearInterval(interval);
        setActiveStep(-1);
      } else {
        setActiveStep(step);
      }
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <section className="py-16 bg-gradient-to-b from-indigo-950/50 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full text-indigo-300 text-sm mb-4">
            <MapPin className="w-4 h-4" />
            Interactive Stories
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Journey <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Stories</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Watch how RTNM AI services work together in real scenarios. From hotels to restaurants, see the future in action.
          </p>
        </div>
      </section>

      <section className="py-8 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-4">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => { setSelectedJourney(journey); setActiveStep(-1); }}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl whitespace-nowrap transition-all ${
                  selectedJourney.id === journey.id
                    ? "bg-slate-700 border-2 border-indigo-500"
                    : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${journey.color} flex items-center justify-center`}>
                  <journey.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-white">{journey.title}</div>
                  <div className="text-xs text-slate-400">{journey.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-indigo-400 mb-1">{selectedJourney.subtitle}</div>
                    <h2 className="text-2xl font-bold text-white">{selectedJourney.title}</h2>
                    <p className="text-slate-400 mt-2">{selectedJourney.description}</p>
                  </div>
                  <button
                    onClick={playJourney}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                      activeStep >= 0
                        ? "bg-amber-500/20 text-amber-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                    }`}
                  >
                    {activeStep >= 0 ? (
                      <><Clock className="w-4 h-4 animate-pulse" /> Playing...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Play Journey</>
                    )}
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedJourney.steps.map((step, i) => (
                    <div
                      key={i}
                      className={`relative pl-8 transition-all duration-500 ${
                        activeStep >= i ? "opacity-100" : activeStep > i ? "opacity-50" : "opacity-70"
                      }`}
                    >
                      {i < selectedJourney.steps.length - 1 && (
                        <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 transition-all duration-500 ${
                          activeStep > i ? "bg-indigo-500" : "bg-slate-700"
                        }`} />
                      )}

                      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                        activeStep === i
                          ? "bg-indigo-500 scale-125 shadow-lg shadow-indigo-500/50"
                          : activeStep > i
                          ? "bg-emerald-500"
                          : "bg-slate-700"
                      }`}>
                        {activeStep > i ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <step.icon className={`w-4 h-4 ${activeStep === i ? "text-white" : "text-slate-400"}`} />
                        )}
                      </div>

                      <div className={`p-4 rounded-xl transition-all duration-500 ${
                        activeStep === i ? "bg-indigo-500/20 border border-indigo-500/50" : "bg-slate-900"
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded">
                            {step.time}
                          </span>
                          <span className="text-xs text-slate-500">{step.phase}</span>
                        </div>
                        <h3 className="font-semibold text-white mb-1">{step.action}</h3>
                        <p className="text-sm text-slate-400">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Key Outcomes</h3>
                <div className="space-y-4">
                  {selectedJourney.stats.map((stat) => (
                    <div key={stat.label} className="text-center p-4 bg-slate-900 rounded-xl">
                      <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">RTNM Services Used</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJourney.services.map((s) => (
                    <span key={s} className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">{s}</span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Explore More</h3>
                <div className="space-y-2">
                  <a href="/playground" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors">
                    <span className="text-slate-300">Try AI Playground</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </a>
                  <a href="/sutar-os" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors">
                    <span className="text-slate-300">Explore SUTAR OS</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </a>
                  <a href="/health" className="flex items-center justify-between p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors">
                    <span className="text-slate-300">View Service Health</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-indigo-900/50 to-purple-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to See It Live?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Try the interactive playground to experience RTNM AI services in action
          </p>
          <a
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors"
          >
            <Play className="w-5 h-5" />
            Try AI Playground
          </a>
        </div>
      </section>
    </div>
  );
}