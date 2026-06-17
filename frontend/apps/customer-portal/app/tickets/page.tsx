'use client';

import TicketList from '@/components/TicketList';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function TicketsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tickets</h1>
          <p className="text-gray-600">
            View and manage your support tickets
          </p>
        </div>
        <Link href="/submit" className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Link>
      </div>

      <TicketList />

      {/* Help Text */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Need immediate help?{' '}
          <Link href="/chat" className="text-primary-600 hover:underline">
            Start a live chat
          </Link>
          {' '}or{' '}
          <Link href="/faq" className="text-primary-600 hover:underline">
            browse our FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
