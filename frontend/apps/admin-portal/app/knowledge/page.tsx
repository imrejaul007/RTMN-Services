'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  FolderOpen,
  FileText,
} from 'lucide-react'

const categories = [
  { id: 'cat-1', name: 'Getting Started', count: 12 },
  { id: 'cat-2', name: 'API Reference', count: 45 },
  { id: 'cat-3', name: 'Troubleshooting', count: 23 },
  { id: 'cat-4', name: 'Best Practices', count: 18 },
  { id: 'cat-5', name: 'Integrations', count: 31 },
]

const articles = [
  {
    id: 'art-1',
    title: 'Getting Started with RTMN',
    excerpt: 'A comprehensive guide to setting up your first workflow and connecting your services.',
    category: 'Getting Started',
    status: 'published',
    views: 1247,
    updatedAt: '2 hours ago',
  },
  {
    id: 'art-2',
    title: 'API Authentication Guide',
    excerpt: 'Learn how to authenticate API requests using JWT tokens and API keys.',
    category: 'API Reference',
    status: 'published',
    views: 892,
    updatedAt: '1 day ago',
  },
  {
    id: 'art-3',
    title: 'Workflow Triggers Reference',
    excerpt: 'Complete reference for all available workflow triggers and their configurations.',
    category: 'API Reference',
    status: 'draft',
    views: 0,
    updatedAt: '3 days ago',
  },
  {
    id: 'art-4',
    title: 'Troubleshooting Connection Issues',
    excerpt: 'Common issues and solutions when connecting external services.',
    category: 'Troubleshooting',
    status: 'published',
    views: 2341,
    updatedAt: '5 days ago',
  },
  {
    id: 'art-5',
    title: 'Best Practices for Workflow Design',
    excerpt: 'Design patterns and recommendations for building scalable workflows.',
    category: 'Best Practices',
    status: 'published',
    views: 567,
    updatedAt: '1 week ago',
  },
  {
    id: 'art-6',
    title: 'Slack Integration Setup',
    excerpt: 'Step-by-step guide to configuring Slack notifications and commands.',
    category: 'Integrations',
    status: 'published',
    views: 445,
    updatedAt: '2 weeks ago',
  },
]

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Manage articles, guides, and documentation</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Article
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>All Articles</span>
                <span className="text-xs opacity-70">{articles.length}</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    selectedCategory === category.name ? 'bg-primary text-primary-foreground' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs opacity-70">{category.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{article.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {article.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{article.excerpt}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{article.category}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {article.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Updated {article.updatedAt}</span>
                    <Link
                      href={`/knowledge/${article.id}`}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
