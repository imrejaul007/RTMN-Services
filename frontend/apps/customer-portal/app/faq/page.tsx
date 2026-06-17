'use client';

import FAQSearch from '@/components/FAQSearch';
import Link from 'next/link';
import { HelpCircle, Book, MessageCircle, Ticket, ChevronRight, FileText, Video, Download } from 'lucide-react';

export default function FAQPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions and learn how to get the most out of RTMN
        </p>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto">
        <FAQSearch />
      </div>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CategoryCard
            icon={<Book className="w-6 h-6" />}
            title="Getting Started"
            description="Learn the basics and get up to speed quickly"
            articleCount={12}
            color="bg-blue-500"
          />
          <CategoryCard
            icon={<MessageCircle className="w-6 h-6" />}
            title="Account & Billing"
            description="Manage your account, subscriptions, and payments"
            articleCount={24}
            color="bg-green-500"
          />
          <CategoryCard
            icon={<FileText className="w-6 h-6" />}
            title="API & Integrations"
            description="Technical documentation and integration guides"
            articleCount={30}
            color="bg-purple-500"
          />
          <CategoryCard
            icon={<Video className="w-6 h-6" />}
            title="Tutorials"
            description="Step-by-step guides with video walkthroughs"
            articleCount={18}
            color="bg-orange-500"
          />
          <CategoryCard
            icon={<Download className="w-6 h-6" />}
            title="Downloads"
            description="Software, plugins, and resources"
            articleCount={8}
            color="bg-teal-500"
          />
          <CategoryCard
            icon={<HelpCircle className="w-6 h-6" />}
            title="Troubleshooting"
            description="Solutions to common issues and errors"
            articleCount={15}
            color="bg-red-500"
          />
        </div>
      </section>

      {/* Popular Articles */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
        <div className="space-y-3">
          <ArticleLink title="How to reset your password" category="Account" views={2453} />
          <ArticleLink title="Setting up two-factor authentication" category="Security" views={1892} />
          <ArticleLink title="Understanding your invoice" category="Billing" views={1567} />
          <ArticleLink title="API authentication and keys" category="API" views={1432} />
          <ArticleLink title="Integrating with Slack" category="Integrations" views={1298} />
        </div>
      </section>

      {/* Contact CTA */}
      <section className="card p-8 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Still need help?</h3>
              <p className="text-sm text-gray-600">Our support team is here for you</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link href="/submit" className="btn-secondary flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              Submit Ticket
            </Link>
            <Link href="/chat" className="btn-primary flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Live Chat
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryCard({
  icon,
  title,
  description,
  articleCount,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  articleCount: number;
  color: string;
}) {
  return (
    <Link
      href={`/faq?category=${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="card p-6 hover:shadow-lg transition-shadow group"
    >
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex items-center text-sm text-gray-500">
        <span>{articleCount} articles</span>
        <ChevronRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
    </Link>
  );
}

function ArticleLink({
  title,
  category,
  views,
}: {
  title: string;
  category: string;
  views: number;
}) {
  return (
    <Link
      href="/faq/getting-started"
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div>
        <h4 className="font-medium text-gray-900 hover:text-primary-600 transition-colors">
          {title}
        </h4>
        <p className="text-sm text-gray-500">{category}</p>
      </div>
      <div className="flex items-center text-sm text-gray-400">
        <span>{views.toLocaleString()} views</span>
        <ChevronRight className="w-4 h-4 ml-2" />
      </div>
    </Link>
  );
}
