import Link from 'next/link';
import { Ticket, MessageCircle, HelpCircle, User, Search, Clock, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          How can we help you today?
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Welcome to the RTMN Customer Support Portal. Browse our FAQ, submit a ticket, or chat with our team.
        </p>

        {/* Quick Search */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              className="input-field pl-12 py-4 text-lg shadow-sm"
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Try searching for &quot;billing&quot;, &quot;account&quot;, or &quot;technical support&quot;
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            href="/submit"
            icon={<Ticket className="w-8 h-8" />}
            title="Submit a Ticket"
            description="Create a new support ticket"
            color="bg-blue-500"
          />
          <QuickActionCard
            href="/tickets"
            icon={<Clock className="w-8 h-8" />}
            title="My Tickets"
            description="View your existing tickets"
            color="bg-purple-500"
          />
          <QuickActionCard
            href="/chat"
            icon={<MessageCircle className="w-8 h-8" />}
            title="Live Chat"
            description="Chat with support now"
            color="bg-green-500"
          />
          <QuickActionCard
            href="/faq"
            icon={<HelpCircle className="w-8 h-8" />}
            title="Knowledge Base"
            description="Browse FAQs and articles"
            color="bg-orange-500"
          />
        </div>
      </section>

      {/* Popular Topics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TopicLink title="Account & Billing" count={24} href="/faq?category=billing" />
          <TopicLink title="Technical Support" count={18} href="/faq?category=technical" />
          <TopicLink title="Getting Started" count={12} href="/faq?category=getting-started" />
          <TopicLink title="API Documentation" count={30} href="/faq?category=api" />
          <TopicLink title="Integrations" count={15} href="/faq?category=integrations" />
          <TopicLink title="Security & Privacy" count={8} href="/faq?category=security" />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Recent Activity</h2>
        <div className="space-y-4">
          <RecentTicket
            subject="Issue with API integration"
            status="open"
            date="2 hours ago"
            href="/tickets/TKT-001"
          />
          <RecentTicket
            subject="Billing inquiry for March"
            status="resolved"
            date="1 day ago"
            href="/tickets/TKT-002"
          />
          <RecentTicket
            subject="Feature request: Dashboard export"
            status="in_progress"
            date="3 days ago"
            href="/tickets/TKT-003"
          />
        </div>
        <Link
          href="/tickets"
          className="mt-4 flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          View all tickets
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </section>

      {/* Help Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Need immediate assistance?</h2>
            <p className="text-primary-100">
              Our support team is available 24/7 to help you.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <Link href="/chat" className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
              <MessageCircle className="w-4 h-4 mr-2 inline" />
              Start Chat
            </Link>
            <Link href="/submit" className="btn-primary bg-primary-700 hover:bg-primary-800">
              <Ticket className="w-4 h-4 mr-2 inline" />
              Submit Ticket
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="card p-6 hover:shadow-lg transition-shadow group"
    >
      <div className={`${color} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}

function TopicLink({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <span className="font-medium text-gray-900">{title}</span>
      <div className="flex items-center text-sm text-gray-500">
        <span className="mr-2">{count} articles</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function RecentTicket({
  subject,
  status,
  date,
  href,
}: {
  subject: string;
  status: string;
  date: string;
  href: string;
}) {
  const statusColors: Record<string, string> = {
    open: 'badge-open',
    in_progress: 'badge-in-progress',
    pending: 'badge-pending',
    resolved: 'badge-resolved',
    closed: 'badge-closed',
  };

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-4">
        <Ticket className="w-5 h-5 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900">{subject}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
      </div>
      <span className={`badge ${statusColors[status]}`}>
        {status.replace('_', ' ')}
      </span>
    </Link>
  );
}
