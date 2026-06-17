'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Zap,
  Loader2,
  ArrowRight,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { getWorkflow, installItem } from '@/lib/api';
import type { Workflow } from '@/lib/types';

function InstallContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const workflowId = searchParams.get('id');

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkflow() {
      if (!workflowId) {
        setLoading(false);
        return;
      }
      try {
        const wf = await getWorkflow(workflowId);
        setWorkflow(wf);
      } catch (err) {
        setError('Failed to load workflow');
      } finally {
        setLoading(false);
      }
    }
    loadWorkflow();
  }, [workflowId]);

  const handleInstall = async () => {
    if (!workflow) return;

    setInstalling(true);
    setError(null);

    try {
      const result = await installItem({
        itemId: workflow.id,
        itemType: 'workflow',
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Installation failed');
      }
    } catch (err) {
      setError('An error occurred during installation');
    } finally {
      setInstalling(false);
    }
  };

  if (!workflowId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No workflow selected</h1>
          <Link href="/workflows" className="text-primary hover:underline">
            Browse workflows
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Workflow not found</h1>
          <Link href="/workflows" className="text-primary hover:underline">
            Browse workflows
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Installation Complete!</h1>
          <p className="text-gray-600 mb-6">
            {workflow.name} has been successfully installed to your workspace.
          </p>
          <div className="space-y-3">
            <Link
              href={`/workflows/${workflow.id}`}
              className="block w-full px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Workflow
            </Link>
            <Link
              href="/workflows"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Browse More Workflows
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href={`/workflows/${workflow.id}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {workflow.name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Install Workflow</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Workflow Preview */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{workflow.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{workflow.steps.length} steps</span>
                  <span>{workflow.integrations.length} integrations</span>
                  <span className="capitalize">{workflow.difficulty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Options */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Installation Options</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace
                </label>
                <div className="relative">
                  <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none">
                    <option>My Workspace</option>
                    <option>Team Workspace</option>
                    <option>Organization</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="relative">
                  <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none">
                    <option>General</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                    <option>Operations</option>
                    <option>HR</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Settings className="w-5 h-5 text-gray-400" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Advanced Configuration</p>
                  <p className="text-gray-500">Configure workflow settings after installation</p>
                </div>
                <input type="checkbox" className="ml-auto w-4 h-4 rounded border-gray-300" />
              </div>
            </div>
          </div>

          {/* Included Items */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">What's Included</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Complete workflow with {workflow.steps.length} steps</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>{workflow.integrations.length} pre-configured integrations</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Documentation and usage guide</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Free updates and support</span>
              </li>
            </ul>
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {workflow.isFree ? 'Free' : `$${workflow.price}`}
                </p>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    {workflow.isFree ? 'Install Free' : 'Purchase & Install'}
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By installing, you agree to the RTMN Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <InstallContent />
    </Suspense>
  );
}
