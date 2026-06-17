'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Plus,
  Trash2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Image,
  Link as LinkIcon,
  Code,
  Quote,
} from 'lucide-react'

const articleData = {
  id: 'art-1',
  title: 'Getting Started with RTMN',
  content: `# Getting Started with RTMN

Welcome to RTMN! This guide will help you set up your first workflow and connect your services.

## Prerequisites

Before you begin, make sure you have:
- An RTMN account with admin access
- At least one connected service
- API credentials for external integrations

## Step 1: Create Your First Workflow

Navigate to the **Workflows** section and click **Create Workflow**.

1. Choose a trigger type
2. Add your first action
3. Configure the action parameters
4. Test your workflow

## Step 2: Connect Services

Go to **Integrations** to connect your external services:
- Slack for notifications
- GitHub for CI/CD triggers
- CRM systems for customer data

## Step 3: Set Up Knowledge Base

Use the Knowledge Base to document your processes:
- Create articles for common issues
- Add step-by-step guides
- Link related articles together

## Next Steps

- Explore the [API Reference](/api-reference)
- Join our [Community Forum](https://community.rtmn.io)
- Contact support for personalized setup assistance
`,
  category: 'Getting Started',
  status: 'published',
  tags: ['onboarding', 'setup', 'tutorial'],
}

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState(articleData)
  const [showPreview, setShowPreview] = useState(false)

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = article.content
      const newContent = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end)
      setArticle({ ...article, content: newContent })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/knowledge"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Article</h1>
            <p className="text-muted-foreground mt-1">Update knowledge base content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={article.status}
            onChange={(e) => setArticle({ ...article, status: e.target.value })}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Title */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <input
              type="text"
              value={article.title}
              onChange={(e) => setArticle({ ...article, title: e.target.value })}
              className="w-full text-2xl font-bold bg-transparent border-0 outline-none"
              placeholder="Article title"
            />
          </div>

          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-2">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => insertMarkdown('**', '**')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertMarkdown('*', '*')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={() => insertMarkdown('\n- ')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertMarkdown('\n1. ')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button
                onClick={() => insertMarkdown('[', '](url)')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertMarkdown('![alt](', ')')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Image"
              >
                <Image className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertMarkdown('`', '`')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Code"
              >
                <Code className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertMarkdown('\n> ')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
            {showPreview ? (
              <div className="p-6 prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br>') }} />
              </div>
            ) : (
              <textarea
                id="editor"
                value={article.content}
                onChange={(e) => setArticle({ ...article, content: e.target.value })}
                className="w-full h-96 p-6 bg-transparent border-0 outline-none resize-none font-mono text-sm"
                placeholder="Write your article in Markdown..."
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold mb-4">Metadata</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Category</label>
                <select
                  value={article.category}
                  onChange={(e) => setArticle({ ...article, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option>Getting Started</option>
                  <option>API Reference</option>
                  <option>Troubleshooting</option>
                  <option>Best Practices</option>
                  <option>Integrations</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => setArticle({ ...article, tags: article.tags.filter(t => t !== tag) })}
                        className="hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button className="inline-flex items-center gap-1 px-2 py-1 border border-dashed rounded text-sm text-muted-foreground hover:text-foreground">
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Views</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="font-medium">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Author</span>
                <span className="font-medium">Admin</span>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Slug</label>
                <input
                  type="text"
                  value="getting-started-with-rtmn"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Meta Description</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm h-20 resize-none"
                  placeholder="Add a description for search engines..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
