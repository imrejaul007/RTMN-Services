'use client';

import Link from 'next/link';
import {
  Download,
  Star,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  Zap,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/api';
import type { Workflow as WorkflowType } from '@/lib/types';
import Rating from './Rating';

interface WorkflowCardProps {
  workflow: WorkflowType;
  compact?: boolean;
}

export default function WorkflowCard({ workflow, compact = false }: WorkflowCardProps) {
  const difficultyColors = {
    beginner: 'text-green-600 bg-green-50',
    intermediate: 'text-yellow-600 bg-yellow-50',
    advanced: 'text-red-600 bg-red-50',
  };

  if (compact) {
    return (
      <Link href={`/workflows/${workflow.id}`}>
        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Workflow className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{workflow.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Rating value={workflow.rating} size="sm" />
              <span>({workflow.reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {workflow.isInstalled && (
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
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/80 rounded-xl shadow-sm flex items-center justify-center">
            <Workflow className="w-8 h-8 text-primary" />
          </div>
        </div>
        {workflow.isFree && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            FREE
          </span>
        )}
        {workflow.isInstalled && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Installed
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
            <Link href={`/workflows/${workflow.id}`}>{workflow.name}</Link>
          </h3>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{workflow.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {workflow.tags.slice(0, 3).map((tag) => (
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
            <Rating value={workflow.rating} size="sm" />
            <span className="font-medium text-gray-900">{workflow.rating}</span>
            <span>({workflow.reviewCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {workflow.installCount.toLocaleString()} installs
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workflow.estimatedTime}
          </div>
          <span className={cn('px-2 py-0.5 rounded-full font-medium', difficultyColors[workflow.difficulty])}>
            {workflow.difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <img
              src={workflow.author.avatar}
              alt={workflow.author.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600">{workflow.author.name}</span>
            {workflow.author.verified && (
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {workflow.isInstalled ? (
              <Link
                href={`/workflows/${workflow.id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                View
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/workflows/install?id=${workflow.id}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4" />
                {workflow.isFree ? 'Install' : `$${workflow.price}`}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
