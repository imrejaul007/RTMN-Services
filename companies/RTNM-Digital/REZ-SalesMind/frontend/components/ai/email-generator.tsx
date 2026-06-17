'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles, Copy, Check } from 'lucide-react'

interface EmailGeneratorProps {
  onGenerate?: (email: { subject: string; body: string }) => void
}

export function EmailGenerator({ onGenerate }: EmailGeneratorProps) {
  const [leadName, setLeadName] = useState('')
  const [leadCompany, setLeadCompany] = useState('')
  const [templateType, setTemplateType] = useState('initial')
  const [tone, setTone] = useState('professional')
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500))

    const email = {
      subject: templateType === 'initial'
        ? `Quick question about ${leadCompany || 'your company'}`
        : templateType === 'followup'
        ? `Following up - ${leadName}`
        : `Quick idea for ${leadCompany || 'your company'}`,
      body: `Hi ${leadName || 'there'},

${templateType === 'initial' ? `I noticed ${leadCompany || 'your company'} has been growing rapidly, and I wanted to reach out about how REZ SalesMind could help streamline your sales operations.

Our AI-powered platform can help teams like yours:
- Automate 80% of prospecting tasks
- Generate personalized emails at scale
- Analyze conversations for buying signals

Would you have 15 minutes this week for a quick demo?` :
      templateType === 'followup' ? `Hi ${leadName},

I wanted to follow up on my previous message about REZ SalesMind. I understand you're busy, so I'll keep this brief.

If you're not the right person to speak with about AI-powered sales automation, I'd appreciate it if you could point me in the right direction.

Otherwise, I'm happy to work around your schedule for a quick call.` :
      `Hi ${leadName},

I wanted to share a quick idea that could help ${leadCompany || 'your team'} close deals faster.

Based on what I know about ${leadCompany || 'similar companies'}, here's a simple framework that has worked well for others in your space...

Let me know if you'd like to discuss this further!`}

    setGeneratedEmail(email)
    setLoading(false)
    onGenerate?.(email)
  }

  const copyToClipboard = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Email Generator</h3>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Lead Name</Label>
            <Input
              placeholder="John Smith"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              placeholder="Acme Corp"
              value={leadCompany}
              onChange={(e) => setLeadCompany(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Template Type</Label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="initial">Initial Outreach</option>
              <option value="followup">Follow-up</option>
              <option value="nurture">Nurture</option>
              <option value="meeting">Meeting Confirmation</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tone</Label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Email
            </>
          )}
        </Button>

        {generatedEmail && (
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Generated Email</span>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm font-medium mb-2">{generatedEmail.subject}</p>
            <div className="text-sm text-muted-foreground whitespace-pre-line">
              {generatedEmail.body}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
