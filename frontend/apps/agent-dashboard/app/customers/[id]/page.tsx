'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Star,
  Calendar,
  ExternalLink,
  Ticket,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Customer360 } from '@/components/Customer360';
import clsx from 'clsx';

const tierConfig = {
  platinum: { label: 'Platinum', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  gold: { label: 'Gold', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  silver: { label: 'Silver', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  bronze: { label: 'Bronze', color: 'text-orange-600 bg-orange-50 border-orange-200' },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { data: customer360, isLoading } = useQuery({
    queryKey: ['customer360', customerId],
    queryFn: () => api.getCustomer360(customerId),
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!customer360) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Customer not found</h2>
        <button onClick={() => router.push('/customers')} className="mt-4 text-primary-600 hover:text-primary-700">
          Back to customers
        </button>
      </div>
    );
  }

  const { customer, orders, payments, tickets } = customer360;
  const tier = tierConfig[customer.tier];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button
          onClick={() => router.push('/customers')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium border', tier.color)}>
              <Star className="w-4 h-4 inline mr-1" />
              {tier.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-primary-600">
              <Mail className="w-4 h-4" />
              {customer.email}
            </a>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                <Phone className="w-4 h-4" />
                {customer.phone}
              </a>
            )}
            {customer.company && (
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {customer.company}
              </span>
            )}
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          <ExternalLink className="w-4 h-4" />
          View in CRM
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer 360 */}
        <div className="lg:col-span-2">
          <Customer360 data={customer360} />
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Recent Orders</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View All
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{order.id}</p>
                      <p className="text-xs text-slate-500">{order.items} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${order.total.toFixed(2)}</p>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium capitalize',
                        order.status === 'delivered' && 'bg-green-100 text-green-700',
                        order.status === 'processing' && 'bg-blue-100 text-blue-700',
                        order.status === 'shipped' && 'bg-purple-100 text-purple-700'
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Recent Payments</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {payments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{payment.method}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${payment.amount.toFixed(2)}</p>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        payment.status === 'completed' && 'bg-green-100 text-green-700'
                      )}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Support Tickets</h3>
                <button
                  onClick={() => router.push(`/tickets?customer=${customer.id}`)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {tickets.slice(0, 3).map((ticket) => (
                <a
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{ticket.subject}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium capitalize',
                      ticket.status === 'open' && 'bg-blue-100 text-blue-700',
                      ticket.status === 'resolved' && 'bg-green-100 text-green-700'
                    )}
                  >
                    {ticket.status}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
