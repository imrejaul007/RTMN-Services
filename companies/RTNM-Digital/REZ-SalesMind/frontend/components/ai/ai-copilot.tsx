'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickActions = [
  'Generate outreach email for top leads',
  'Summarize this week\'s call recordings',
  'What are the best times to contact leads?',
  'Analyze my conversion rate trends',
]

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI Sales Copilot. I can help you with:\n\n- Generating personalized outreach\n- Analyzing call recordings\n- Optimizing your sales process\n- Identifying best leads to contact\n\nWhat can I help you with today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    setMessages([...messages, userMessage])
    setInput('')
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1200))

    const responses: Record<string, string> = {
      'Generate outreach email for top leads': 'Based on your top 10 leads, I\'ve identified 3 high-priority prospects. Here are personalized email subjects:\n\n1. John Smith (TechCorp) - "Quick idea for TechCorp"\n2. Emily Davis (RetailPlus) - "Following up on our conversation"\n3. Sarah Johnson (StartupXYZ) - "Congrats on the Series B! 🎉"\n\nShall I generate the full email content?',
      'Summarize this week\'s call recordings': 'This week you had 15 calls totaling 4.2 hours:\n\nKey themes:\n- 8 leads asked about pricing\n- 5 leads requested demos\n- 3 leads are ready to buy\n\nTop objection: "Need to discuss with my team"\n\nBest performer: Your demo presentation had a 73% positive response rate.',
      'What are the best times to contact leads?': 'Based on your CRM data, the best times to contact leads are:\n\nPeak response times:\n- Tuesday 9-11 AM (28% higher response)\n- Wednesday 2-4 PM\n- Thursday 10 AM - 12 PM\n\nLowest response rates:\n- Friday afternoons\n- Monday mornings\n\nWould you like me to schedule your outreach for optimal times?',
      'Analyze my conversion rate trends': 'Your conversion rate analysis:\n\nLast 30 days:\n- Leads → Contacted: 65% (+5%)\n- Contacted → Qualified: 42% (-2%)\n- Qualified → Proposal: 38% (+8%)\n- Overall Close Rate: 8.5%\n\nThe Qualified → Proposal stage is your strongest. Consider:\n1. More discovery calls\n2. Better qualification criteria\n3. Faster follow-up after initial contact',
    }

    const responseText = responses[input] || 'I understand you want help with that. Let me analyze your data and provide insights. You can ask me about leads, campaigns, emails, or any aspect of your sales process.'

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])
    setLoading(false)
  }

  const handleQuickAction = (action: string) => {
    setInput(action)
  }

  return (
    <div className="flex flex-col h-[500px] rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Sales Copilot</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-primary' : 'bg-muted'
              }`}>
                {msg.role === 'user' ? (
                  <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div className={`rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => handleQuickAction(action)}
              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              {action}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything about your sales..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
