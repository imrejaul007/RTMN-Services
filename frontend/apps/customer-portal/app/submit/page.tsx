'use client';

import SubmitTicket from '@/components/SubmitTicket';

export default function SubmitPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit a Ticket</h1>
        <p className="text-gray-600">
          Describe your issue and our team will get back to you as soon as possible.
        </p>
      </div>

      <div className="card p-6">
        <SubmitTicket />
      </div>

      {/* Tips Section */}
      <div className="mt-8 card p-6 bg-gray-50 border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Tips for faster resolution</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="mr-2 text-primary-600">1.</span>
            Be specific about your issue - include error messages if applicable
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-primary-600">2.</span>
            Include your account email if it relates to account issues
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-primary-600">3.</span>
            Attach screenshots that show the issue you are experiencing
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-primary-600">4.</span>
            Select the appropriate category to route your ticket correctly
          </li>
        </ul>
      </div>
    </div>
  );
}
