'use client'

import { useState } from 'react'
import { EmailGenerator } from '@/components/ai/email-generator'
import { SentimentAnalyzer } from '@/components/ai/sentiment-analyzer'
import { AICopilot } from '@/components/ai/ai-copilot'
import { Tab } from '@/components/ui/tab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sparkles, Mail, MessageSquare, Bot } from 'lucide-react'

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState('email')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Intelligence</h1>
        <p className="text-muted-foreground">
          AI-powered tools for sales automation and insights
        </p>
      </div>

      <div className="grid gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Generator
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Sentiment Analysis
            </TabsTrigger>
            <TabsTrigger value="copilot" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Copilot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <EmailGenerator />
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Generated Templates</h3>
                <div className="space-y-4">
                  <TemplateCard
                    title="Initial Outreach"
                    subject="Quick question about [Company]"
                    preview="Hi [Name], I noticed [Company] has been growing..."
                    usageCount={127}
                  />
                  <TemplateCard
                    title="Follow-up Sequence"
                    subject="Following up - [First Name]"
                    preview="Hi [Name], I wanted to follow up on my previous..."
                    usageCount={89}
                  />
                  <TemplateCard
                    title="Meeting Confirmation"
                    subject="Confirmed: Demo call tomorrow"
                    preview="Great speaking with you today! This email confirms..."
                    usageCount={45}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-6">
            <SentimentAnalyzer />
          </TabsContent>

          <TabsContent value="copilot" className="mt-6">
            <AICopilot />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function TemplateCard({
  title,
  subject,
  preview,
  usageCount
}: {
  title: string
  subject: string
  preview: string
  usageCount: number
}) {
  return (
    <div className="rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{subject}</p>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
          {usageCount} uses
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{preview}</p>
    </div>
  )
}
