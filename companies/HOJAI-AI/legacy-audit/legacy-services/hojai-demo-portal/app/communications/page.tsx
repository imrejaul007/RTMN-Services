"use client";
import { useState } from "react";
import { MessageSquare, Mail, MessageCircle, Send, Copy, Check } from "lucide-react";

const channels = [
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "from-emerald-500 to-green-600" },
  { id: "sms", name: "SMS", icon: MessageSquare, color: "from-blue-500 to-blue-600" },
  { id: "email", name: "Email", icon: Mail, color: "from-slate-500 to-slate-600" },
];

const templates = [
  { id: "booking", name: "Booking Confirmation", content: "Your table at SpiceRoute is confirmed for {date} at {time} for {guests} guests. Reply CANCEL to cancel." },
  { id: "order", name: "Order Update", content: "Your order #{order_id} is being prepared. Estimated delivery: {eta}. Track at: {tracking_url}" },
  { id: "reminder", name: "Appointment Reminder", content: "Reminder: Your appointment with Dr. Sharma is tomorrow at {time}. Reply CONFIRM to confirm or RESCHEDULE to reschedule." },
  { id: "payment", name: "Payment Receipt", content: "Payment of ₹{amount} received via RABTUL. Transaction ID: {txn_id}. Thank you!" },
];

export default function CommunicationsPage() {
  const [selectedChannel, setSelectedChannel] = useState(channels[0]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [message, setMessage] = useState(templates[0].content);
  const [phone, setPhone] = useState("+91 98765 43210");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const sendMessage = () => {
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <section className="py-8 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-indigo-400" />
            Communications Simulator
          </h1>
          <p className="text-slate-400 mt-1">Preview WhatsApp, SMS, and Email messages powered by RABTUL Communications (4570)</p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Message Builder */}
            <div className="space-y-6">
              {/* Channel Selector */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Select Channel</h3>
                <div className="flex gap-3">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                        selectedChannel.id === channel.id
                          ? `bg-gradient-to-r ${channel.color} text-white`
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      <channel.icon className="w-5 h-5" />
                      {channel.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Selector */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Message Template</h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => { setSelectedTemplate(template); setMessage(template.content); }}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedTemplate.id === template.id
                          ? "bg-indigo-500/20 border border-indigo-500"
                          : "bg-slate-700 border border-slate-600 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium text-white">{template.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Composer */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Compose Message</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Recipient</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyMessage}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-xl text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {sent ? "Message Sent!" : "Send Message"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Message Preview</h3>
              {selectedChannel.id === "whatsapp" ? (
                <div className="bg-[#111b21] rounded-2xl p-4 max-w-sm">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#374045]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <span className="text-white font-semibold">SR</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">SpiceRoute Restaurant</div>
                      <div className="text-xs text-emerald-400">online</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-[#005c4b] rounded-2xl rounded tl-none px-4 py-2 max-w-[80%]">
                      <p className="text-white text-sm whitespace-pre-wrap">{message}</p>
                      <div className="text-[10px] text-emerald-400/60 mt-1 text-right">10:30 AM</div>
                    </div>
                  </div>
                </div>
              ) : selectedChannel.id === "sms" ? (
                <div className="bg-white rounded-2xl p-4 max-w-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-slate-800" />
                    <span className="text-slate-800 font-medium">SMS</span>
                  </div>
                  <div className="bg-slate-100 rounded-xl p-4">
                    <p className="text-slate-800 text-sm whitespace-pre-wrap">{message}</p>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    From: +91 98765 43210 | To: {phone}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 max-w-lg">
                  <div className="border-b border-slate-200 pb-4 mb-4">
                    <div className="text-slate-500 text-sm">From: noreply@hojai.ai</div>
                    <div className="text-slate-500 text-sm">To: {phone}</div>
                    <div className="text-slate-800 font-medium mt-2">Message from HOJAI AI</div>
                  </div>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap">{message}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}