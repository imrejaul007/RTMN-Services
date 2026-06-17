'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, TrendingUp, TrendingDown, Minus, MessageSquare } from 'lucide-react'

export function SentimentAnalyzer() {
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Simulate sentiment analysis
    const positiveWords = ['great', 'love', 'good', 'excellent', 'interested', 'perfect', 'like']
    const negativeWords = ['bad', 'hate', 'not', 'no', 'disappointed', 'problem', 'issue']
    const lowerText = text.toLowerCase()
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length

    let sentiment: 'positive' | 'negative' | 'neutral'
    let score: number

    if (positiveCount > negativeCount) {
      sentiment = 'positive'
      score = 0.6 + Math.random() * 0.3
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative'
      score = 0.2 + Math.random() * 0.3
    } else {
      sentiment = 'neutral'
      score = 0.4 + Math.random() * 0.2
    }

    setAnalysis({
      sentiment,
      score: Math.round(score * 100),
      positiveSignals: positiveCount,
      negativeSignals: negativeCount,
      questions: (text.match(/\?/g) || []).length,
      keyPhrases: [
        'Interested in automation',
        'Concerned about pricing',
        'Looking for demo'
      ]
    })
    setLoading(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Analyze Conversation</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paste conversation or message</Label>
            <Textarea
              placeholder="Paste email reply, call transcript, or chat conversation..."
              className="min-h-[200px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={loading || !text.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Analyze Sentiment
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
        {analysis ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {analysis.sentiment === 'positive' && (
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {analysis.sentiment === 'negative' && (
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                )}
                {analysis.sentiment === 'neutral' && (
                  <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Minus className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}
                <div>
                  <p className="text-2xl font-bold capitalize">{analysis.sentiment}</p>
                  <p className="text-sm text-muted-foreground">Overall sentiment</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{analysis.score}%</p>
                <p className="text-sm text-muted-foreground">Confidence</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analysis.positiveSignals}</p>
                <p className="text-sm text-muted-foreground">Positive signals</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analysis.negativeSignals}</p>
                <p className="text-sm text-muted-foreground">Negative signals</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Key Phrases Detected</p>
              <div className="flex flex-wrap gap-2">
                {analysis.keyPhrases.map((phrase: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Enter text to analyze sentiment</p>
          </div>
        )}
      </div>
    </div>
  )
}
