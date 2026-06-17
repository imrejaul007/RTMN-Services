'use client';

import Link from 'next/link';
import {
  Download,
  Star,
  BookOpen,
  FileText,
  CheckCircle2,
  ChevronRight,
  File,
  Video,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/api';
import type { KnowledgePack } from '@/lib/types';
import Rating from './Rating';

interface KnowledgeCardProps {
  knowledge: KnowledgePack;
  compact?: boolean;
}

const documentIcons = {
  pdf: FileText,
  doc: File,
  video: Video,
  link: LinkIcon,
  article: FileText,
};

export default function KnowledgeCard({ knowledge, compact = false }: KnowledgeCardProps) {
  if (compact) {
    return (
      <Link href={`/knowledge/${knowledge.id}`}>
        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{knowledge.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Rating value={knowledge.rating} size="sm" />
              <span>({knowledge.reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {knowledge.isInstalled && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Installed
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/80 rounded-xl shadow-sm flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-secondary" />
          </div>
        </div>
        {knowledge.isFree && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            FREE
          </span>
        )}
        {knowledge.isInstalled && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Installed
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-secondary transition-colors line-clamp-1">
            <Link href={`/knowledge/${knowledge.id}`}>{knowledge.name}</Link>
          </h3>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{knowledge.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {knowledge.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Rating value={knowledge.rating} size="sm" />
            <span className="font-medium text-gray-900">{knowledge.rating}</span>
            <span>({knowledge.reviewCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {knowledge.downloadCount.toLocaleString()} downloads
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {knowledge.documentCount} documents
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {knowledge.documents.slice(0, 3).map((doc) => {
            const Icon = documentIcons[doc.type];
            return (
              <div
                key={doc.id}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border"
              >
                <Icon className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{doc.title}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <img
              src={knowledge.author.avatar}
              alt={knowledge.author.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600">{knowledge.author.name}</span>
            {knowledge.author.verified && (
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {knowledge.isInstalled ? (
              <Link
                href={`/knowledge/${knowledge.id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
              >
                View
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/knowledge/install?id=${knowledge.id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-secondary text-white hover:bg-secondary/90 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                {knowledge.isFree ? 'Install' : `$${knowledge.price}`}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
