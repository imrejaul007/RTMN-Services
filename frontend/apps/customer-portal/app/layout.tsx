import type { Metadata } from 'next';
import Link from 'next/link';
import { Ticket, MessageCircle, HelpCircle, User, Home } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer Support Portal | RTMN',
  description: 'Submit tickets, chat with support, and find answers in our knowledge base',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <div>
                  <span className="font-bold text-xl text-gray-900">RTMN</span>
                  <span className="text-gray-500 text-sm ml-1">Support</span>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                <NavLink href="/" icon={<Home className="w-4 h-4" />} label="Home" />
                <NavLink href="/submit" icon={<Ticket className="w-4 h-4" />} label="Submit Ticket" />
                <NavLink href="/tickets" icon={<Ticket className="w-4 h-4" />} label="My Tickets" />
                <NavLink href="/chat" icon={<MessageCircle className="w-4 h-4" />} label="Live Chat" />
                <NavLink href="/faq" icon={<HelpCircle className="w-4 h-4" />} label="FAQ" />
                <NavLink href="/profile" icon={<User className="w-4 h-4" />} label="Profile" />
              </nav>

              {/* Mobile menu button */}
              <button className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-sm text-gray-500">
                RTMN Customer Support Portal
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <Link href="/faq" className="text-sm text-gray-500 hover:text-primary-600">
                  Help Center
                </Link>
                <Link href="/submit" className="text-sm text-gray-500 hover:text-primary-600">
                  Submit a Ticket
                </Link>
                <Link href="/chat" className="text-sm text-gray-500 hover:text-primary-600">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
