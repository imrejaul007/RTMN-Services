'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Send, AlertCircle } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import type { TicketPriority, SubmitTicketForm } from '@/lib/types';

const CATEGORIES = [
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'account', label: 'Account Management' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: TicketPriority; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'General questions, no urgency' },
  { value: 'medium', label: 'Medium', description: 'Some impact on work' },
  { value: 'high', label: 'High', description: 'Significant impact, time-sensitive' },
  { value: 'urgent', label: 'Urgent', description: 'System down, critical business impact' },
];

export default function SubmitTicket() {
  const router = useRouter();
  const { createTicket } = useTickets();

  const [form, setForm] = useState<SubmitTicketForm>({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    attachments: [],
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...files].slice(0, 5),
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createTicket(form);

    if (result.success && result.ticket) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/tickets/${result.ticket!.id}`);
      }, 1500);
    } else {
      setError(result.error || 'Failed to submit ticket');
    }

    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
        <p className="text-gray-600 mb-6">
          Your ticket has been submitted successfully. Redirecting you to view your ticket...
        </p>
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="subject"
          value={form.subject}
          onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
          className="input-field"
          placeholder="Brief summary of your issue"
          required
          maxLength={200}
        />
        <p className="text-xs text-gray-500 mt-1">{form.subject.length}/200 characters</p>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          className="input-field"
          required
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRIORITIES.map((priority) => (
            <label
              key={priority.value}
              className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                form.priority === priority.value
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value={priority.value}
                checked={form.priority === priority.value}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: e.target.value as TicketPriority }))
                }
                className="sr-only"
              />
              <span
                className={`font-medium ${
                  form.priority === priority.value ? 'text-primary-700' : 'text-gray-700'
                }`}
              >
                {priority.label}
              </span>
              <span className="text-xs text-gray-500 text-center mt-1">
                {priority.description}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="input-field resize-none"
          rows={8}
          placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant context."
          required
          minLength={20}
        />
        <p className="text-xs text-gray-500 mt-1">
          Minimum 20 characters. {form.description.length} characters typed.
        </p>
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
          <input
            type="file"
            id="attachments"
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
          />
          <label htmlFor="attachments" className="cursor-pointer">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              <span className="text-primary-600 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, PDF, DOC up to 10MB each (max 5 files)
            </p>
          </label>
        </div>

        {/* File list */}
        {form.attachments && form.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {form.attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500 uppercase">
                      {file.name.split('.').pop()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Our team typically responds within 24 hours
        </p>
        <button
          type="submit"
          className="btn-primary flex items-center"
          disabled={
            submitting ||
            !form.subject.trim() ||
            !form.description.trim() ||
            form.description.length < 20
          }
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </form>
  );
}
