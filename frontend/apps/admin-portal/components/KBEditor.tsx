'use client'

import { useState } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Save,
  Eye,
  FileText,
} from 'lucide-react'

interface KBEditorProps {
  content: string
  onChange: (content: string) => void
  title?: string
  onTitleChange?: (title: string) => void
}

export function KBEditor({ content, onChange, title, onTitleChange }: KBEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('kb-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      const newContent =
        content.substring(0, start) +
        before +
        selectedText +
        after +
        content.substring(end)
      onChange(newContent)

      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + before.length,
          end + before.length
        )
      }, 0)
    }
  }

  const toolbarItems = [
    { icon: Heading1, label: 'Heading 1', action: () => insertText('# ') },
    { icon: Heading2, label: 'Heading 2', action: () => insertText('## ') },
    { icon: Heading3, label: 'Heading 3', action: () => insertText('### ') },
    { type: 'divider' },
    { icon: Bold, label: 'Bold', action: () => insertText('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertText('*', '*') },
    { type: 'divider' },
    { icon: List, label: 'Bullet List', action: () => insertText('\n- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertText('\n1. ') },
    { type: 'divider' },
    { icon: LinkIcon, label: 'Link', action: () => insertText('[', '](url)') },
    { icon: Image, label: 'Image', action: () => insertText('![alt](', ')') },
    { icon: Code, label: 'Code', action: () => insertText('`', '`') },
    { icon: Quote, label: 'Quote', action: () => insertText('\n> ') },
  ]

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 rounded">$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 italic my-2">$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4" />')
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      {title !== undefined && onTitleChange && (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-3xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground"
          placeholder="Article title..."
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarItems.map((item, index) =>
            item.type === 'divider' ? (
              <div key={index} className="w-px h-6 bg-border mx-1" />
            ) : (
              <button
                key={index}
                onClick={item.action}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </button>
            )
          )}
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showPreview
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {showPreview ? (
            <>
              <FileText className="h-4 w-4" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Preview
            </>
          )}
        </button>
      </div>

      {/* Editor / Preview */}
      <div className="min-h-[400px] bg-white dark:bg-slate-900 border rounded-lg overflow-hidden">
        {showPreview ? (
          <div className="p-6 prose dark:prose-invert max-w-none">
            {title && <h1 className="text-3xl font-bold mb-4">{title}</h1>}
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          </div>
        ) : (
          <textarea
            id="kb-editor"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[400px] p-6 bg-transparent border-0 outline-none resize-none font-mono text-sm leading-relaxed"
            placeholder="Write your article in Markdown...

# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

- List item 1
- List item 2

1. Numbered item 1
2. Numbered item 2

[Link text](https://example.com)

> Blockquote

`inline code`"
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  )
}
