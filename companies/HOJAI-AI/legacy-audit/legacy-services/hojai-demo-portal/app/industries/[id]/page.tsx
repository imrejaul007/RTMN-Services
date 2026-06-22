"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Send, Bot, User, Loader2, Utensils, Heart, Building2, ShoppingBag, Car } from "lucide-react";

const industryData: Record<string, {
  name: string;
  icon: typeof Utensils;
  color: string;
  product: string;
  port: number;
  description: string;
  features: string[];
  responses: Record<string, string>;
}> = {
  restaurant: {
    name: "Restaurant",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    product: "Waitron",
    port: 4775,
    description: "AI-powered restaurant management system",
    features: ["Voice Ordering", "Inventory AI", "KDS Display", "Upsell Suggestions"],
    responses: {
      default: "Welcome to Waitron! I can help you with:\n\n• Taking orders\n• Checking inventory\n• Kitchen display management\n• Customer recommendations\n\nWhat would you like to do?",
      order: "I've noted your order. Let me check the kitchen status and KDS display for current wait times. You have 12 orders in queue, average prep time is 8 minutes.",
      inventory: "Current inventory status:\n\n• Tomatoes: LOW (200g remaining)\n• Onions: OK (15kg)\n• Chicken: OK (25kg)\n\nTomatoes are below threshold. Shall I trigger SUTAR procurement?",
      recommend: "Based on today's popular orders, I recommend:\n\n1. Biryani (87 orders)\n2. Butter Chicken (62 orders)\n3. Garlic Naan (54 orders)\n\nCustomers who order biryani frequently add garlic bread - 30% increase in check size!",
    },
  },
  healthcare: {
    name: "Healthcare",
    icon: Heart,
    color: "from-pink-500 to-rose-600",
    product: "RisaCare",
    port: 4800,
    description: "Smart healthcare coordination platform",
    features: ["AI Triage", "Health Twin", "Prescription Routing", "Insurance Verify"],
    responses: {
      default: "Welcome to RisaCare! I can help you with:\n\n• Symptom assessment\n• Appointment scheduling\n• Prescription management\n• Insurance verification\n\nWhat do you need assistance with?",
      symptom: "Based on your symptoms, I'm assessing urgency level... Moderate. I recommend scheduling an appointment today. RisaCare Human Twin will prepare your health history for the doctor.",
      appointment: "Available slots today:\n• 10:00 AM - Dr. Sharma (Cardiologist)\n• 2:00 PM - Dr. Patel (General Physician)\n• 4:30 PM - Dr. Kumar (Internal Medicine)\n\nWhich slot works for you?",
      prescription: "Your prescription has been sent to MedPlus Pharmacy, Jayanagar. Medicine will be ready in 20 minutes. RABTUL insurance verified - coverage 90%.",
      insurance: "Insurance verification complete:\n\n• Provider: RABTUL Health\n• Policy: Premium Plus\n• Coverage: 90% for consultation, 80% for diagnostics\n• Deductible: ₹5,000 (already met)\n\nYou're all set!",
    },
  },
  hospitality: {
    name: "Hospitality",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    product: "StayOwn",
    port: 4801,
    description: "Invisible hotel experience management",
    features: ["GPS Room Prep", "Voice Control", "Auto Checkout", "Preference Learning"],
    responses: {
      default: "Welcome to StayOwn! Your AI hotel assistant. I can help you with:\n\n• Room preferences\n• Service requests\n• Restaurant orders\n• Checkout\n\nHow may I assist you today?",
      room: "Your room 305 is ready! I've pre-cooled the AC to 22°C based on your preference. Lights set to warm mode. Welcome snacks placed as you like.",
      service: "Available services:\n• Room service (24/7)\n• Housekeeping\n• Restaurant booking\n• Spa appointment\n• Taxi booking\n\nWhat would you like?",
      checkout: "Zero checkout initiated!\n\n• Room charges: ₹8,500\n• RABTUL Payment auto-charged\n• Smart lock revoked\n• Review requested via Nexha\n\nThank you for staying with us!",
      preference: "I've noted your preferences:\n• Extra napkins\n• Late breakfast (10 AM)\n• Extra pillows\n\nThese will be automatically arranged for your next visit!",
    },
  },
  retail: {
    name: "Retail",
    icon: ShoppingBag,
    color: "from-emerald-500 to-teal-600",
    product: "Nexha",
    port: 5002,
    description: "Commerce network intelligence platform",
    features: ["Smart POS", "Supplier Matching", "Demand Forecasting", "Multi-channel"],
    responses: {
      default: "Welcome to Nexha! Commerce network AI. I can help you with:\n\n• POS transactions\n• Supplier discovery\n• Inventory management\n• Sales analytics\n\nWhat do you need?",
      pos: "Transaction processed!\n\n• Items: 5\n• Total: ₹2,450\n• Payment: RABTUL UPI ✓\n\nReceipt sent to your email. Inventory updated.",
      supplier: "Supplier discovery results:\n\n1. Fresh Farms (Trust: 92) - ₹35/kg\n2. AgriCorp (Trust: 78) - ₹32/kg\n3. GreenGro (Trust: 85) - ₹38/kg\n\nVerified via Axom Trust. Ready to negotiate?",
      forecast: "Demand forecast for next week:\n\n• Biryani ingredients: +35% (weekend surge)\n• Beverages: +20%\n• Desserts: -15% (post-festival dip)\n\nRecommend increasing inventory accordingly.",
    },
  },
  mobility: {
    name: "Mobility",
    icon: Car,
    color: "from-blue-500 to-cyan-600",
    product: "KHAIRMOVE",
    port: 4600,
    description: "Mobility intelligence platform",
    features: ["Auto Booking", "Fleet Optimization", "Safety Monitoring", "Expense Tracking"],
    responses: {
      default: "Welcome to KHAIRMOVE! Your mobility assistant. I can help you with:\n\n• Ride booking\n• Fleet management\n• Route optimization\n• Expense tracking\n\nWhat do you need?",
      booking: "Ride booked!\n\n• From: MG Road\n• To: Indiranagar\n• Driver: Rajesh (4.8 stars)\n• ETA: 12 mins\n• Vehicle: Maruti Swift (KA-01-AB-1234)\n\nCorpPerks expense tracking enabled.",
      fleet: "Fleet status:\n\n• Active rides: 23\n• Available drivers: 8\n• In maintenance: 2\n\nEfficiency: 94% (target: 90%)",
      expense: "Expense report generated:\n\n• Business trips: 12\n• Total: ₹4,560\n• Claimed: ₹4,200\n• Pending: ₹360\n\nCorpPerks reimbursement initiated.",
    },
  },
};

type Message = { role: "user" | "assistant"; content: string };

export default function IndustryDetailPage() {
  const params = useParams();
  const industryId = params.id as string;
  const data = industryData[industryId] || industryData.restaurant;
  const Icon = data.icon;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: data.responses.default }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = text.toLowerCase();
      let response = data.responses.default;
      if (lower.includes("order") || lower.includes("table")) response = data.responses.order || data.responses.default;
      else if (lower.includes("inventory") || lower.includes("stock")) response = data.responses.inventory || data.responses.default;
      else if (lower.includes("recommend") || lower.includes("suggest")) response = data.responses.recommend || data.responses.default;
      else if (lower.includes("symptom") || lower.includes("health")) response = data.responses.symptom || data.responses.default;
      else if (lower.includes("appointment") || lower.includes("schedule")) response = data.responses.appointment || data.responses.default;
      else if (lower.includes("room") || lower.includes("check")) response = data.responses.room || data.responses.default;
      else if (lower.includes("checkout") || lower.includes("leave")) response = data.responses.checkout || data.responses.default;
      else if (lower.includes("payment") || lower.includes("pos")) response = data.responses.pos || data.responses.default;
      else if (lower.includes("ride") || lower.includes("book")) response = data.responses.booking || data.responses.default;
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className={`h-2 bg-gradient-to-r ${data.color}`} />
      <section className="py-8 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${data.color} flex items-center justify-center`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{data.name} Demo</h1>
              <p className="text-slate-400">{data.product} (Port {data.port})</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-400">Live Demo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-slate-600" : `bg-gradient-to-br ${data.color}`
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-200"
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${data.color}`}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-700 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-700 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder={`Ask about ${data.product}...`}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-400 mb-3">{data.product} Features</h3>
            <div className="flex flex-wrap gap-2">
              {data.features.map((feature) => (
                <span key={feature} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}