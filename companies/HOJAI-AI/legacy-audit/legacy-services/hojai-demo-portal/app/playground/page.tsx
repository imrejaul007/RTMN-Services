"use client";
import { useState } from "react";
import { Send, Bot, User, Sparkles, Loader2, MessageSquare, Phone, Mail, Calendar, Users } from "lucide-react";

const agents = [
  { id: "support", name: "Support Agent", icon: MessageSquare, description: "Handles customer inquiries and support tickets", port: 4760 },
  { id: "sales", name: "Sales Agent", icon: Phone, description: "Assists with product recommendations and pricing", port: 4761 },
  { id: "receptionist", name: "Receptionist", icon: Calendar, description: "Manages appointments and scheduling", port: 4762 },
  { id: "hr", name: "HR Recruiter", icon: Users, description: "Screens candidates and schedules interviews", port: 4763 },
];

const prompts = [
  "What services does HOJAI offer?",
  "How do I integrate with your API?",
  "What are your pricing plans?",
  "Can you help me set up an AI employee?",
];

const responses: Record<string, string> = {
  default: "I'm a HOJAI AI Employee powered by the RTNM ecosystem. I can help you with:\n\n• Service information and recommendations\n• API integration guidance\n• Pricing and plans\n• Technical support\n\nWhich area would you like to explore?",
  "services": "HOJAI offers 174 AI Employees across 12 Core Platforms:\n\n• BrandPulse (4770) - Brand Intelligence\n• HIB (3053) - Human Intelligence\n• AssetMind (5001) - Financial Intelligence\n• Nexha (5002) - Commerce Network\n• RisaCare (4800) - Healthcare Intelligence\n• StayOwn (4801) - Hospitality Intelligence\n• CorpPerks (4720) - Workforce Intelligence\n• KHAIRMOVE (4600) - Mobility Intelligence\n\nEach platform has specialized AI agents ready to help.",
  "api": "To integrate with HOJAI APIs:\n\n\n1. Get your API key from the dashboard\n2. Base URL: https://api.hojai.ai\n3. Key endpoints:\n   • /api/services - List all services\n   • /api/agents/execute - Run an AI agent\n   • /api/memory - Store/retrieve context\n\nAuthentication: Bearer token in header.",
  "pricing": "HOJAI pricing tiers:\n\n\n• Starter: 5 AI Employees, ₹999/mo\n• Business: 25 AI Employees, ₹4,999/mo\n• Enterprise: Unlimited + Custom agents\n\nContact sales for volume discounts.",
};

type Message = { role: "user" | "assistant"; content: string };

export default function PlaygroundPage() {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: responses.default }
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
      let response = responses.default;
      if (lower.includes("service")) response = responses.services;
      else if (lower.includes("api") || lower.includes("integrat")) response = responses.api;
      else if (lower.includes("price") || lower.includes("plan")) response = responses.pricing;
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">AI Employees</h2>
        <div className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedAgent.id === agent.id
                  ? "bg-indigo-500/20 border border-indigo-500"
                  : "bg-slate-900 border border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <agent.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white text-sm">{agent.name}</div>
                <div className="text-xs text-slate-400">Port {agent.port}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Prompts</h3>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="w-full text-left px-3 py-2 text-sm text-slate-300 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <selectedAgent.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{selectedAgent.name}</h1>
              <p className="text-sm text-slate-400">{selectedAgent.description}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-slate-600" : "bg-gradient-to-br from-indigo-500 to-purple-600"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.role === "user" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-200"
              }`}>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-slate-800 border-t border-slate-700 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}