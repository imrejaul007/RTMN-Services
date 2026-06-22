"use client";

import * as React from "react";
import { Send, Loader2, Sparkles, Clock, X, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clsx } from "clsx";

interface QueryResult {
  type: "text" | "chart" | "table" | "metric";
  content: string | object;
  source?: string;
  confidence?: number;
}

interface QueryHistory {
  id: string;
  query: string;
  results: QueryResult[];
  timestamp: Date;
}

interface QueryInputProps {
  onQuery?: (query: string) => Promise<QueryResult[]>;
  initialHistory?: QueryHistory[];
  className?: string;
}

const suggestedQueries = [
  "Why did sales drop this quarter?",
  "What is our biggest risk right now?",
  "Show me the top performing products",
  "Any critical alerts I should know about?",
  "What's our customer churn rate?",
  "Team capacity for next sprint",
];

export function QueryInput({
  onQuery,
  initialHistory = [],
  className,
}: QueryInputProps) {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<QueryResult[]>([]);
  const [history, setHistory] = React.useState<QueryHistory[]>(initialHistory);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setShowSuggestions(false);
    setShowHistory(false);

    try {
      let queryResults: QueryResult[];

      if (onQuery) {
        queryResults = await onQuery(query);
      } else {
        // Demo mode - simulate AI response
        await new Promise((resolve) => setTimeout(resolve, 1500));
        queryResults = [
          {
            type: "text",
            content: `Based on my analysis of your business data, here's what I found for: "${query}"\n\nThe data shows several important patterns that may be relevant to your question. Revenue trends indicate a positive trajectory with some seasonal variations. Customer acquisition has been steady with a slight uptick in enterprise segments.`,
            source: "Multi-source analysis",
            confidence: 0.92,
          },
        ];
      }

      setResults(queryResults);

      // Add to history
      const historyItem: QueryHistory = {
        id: Date.now().toString(),
        query,
        results: queryResults,
        timestamp: new Date(),
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error("Query failed:", error);
      setResults([
        {
          type: "text",
          content: "I encountered an error while processing your query. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const loadFromHistory = (item: QueryHistory) => {
    setQuery(item.query);
    setResults(item.results);
    setShowHistory(false);
  };

  const clearResults = () => {
    setResults([]);
    setShowSuggestions(true);
    setQuery("");
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Natural Language Query</CardTitle>
          </div>
          {history.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-1"
              >
                <Clock className="h-4 w-4" />
                History
                <ChevronDown className="h-3 w-3" />
              </Button>

              {showHistory && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-10">
                  <div className="p-2">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full rounded-md p-2 text-left text-sm hover:bg-accent"
                      >
                        <p className="truncate font-medium">{item.query}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.timestamp.toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your business..."
            icon={<Sparkles className="h-4 w-4" />}
            className="pr-20"
            disabled={loading}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Suggestions */}
        {showSuggestions && results.length === 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 animate-fade-in-up">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Analysis Results</span>
                {results[0]?.confidence && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    {Math.round(results[0].confidence * 100)}% confidence
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearResults}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {results.map((result, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-4">
                {result.type === "text" && (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {result.content as string}
                    </p>
                  </div>
                )}
                {result.type === "metric" && (
                  <div className="text-2xl font-bold">
                    {typeof result.content === "object" && "value" in result.content
                      ? result.content.value
                      : result.content}
                  </div>
                )}
                {result.source && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source: {result.source}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
