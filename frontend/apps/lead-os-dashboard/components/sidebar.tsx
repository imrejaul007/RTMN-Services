'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Search, Brain, Megaphone, BarChart3, Settings } from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/discover', icon: Search, label: 'Discover' },
  { href: '/intelligence', icon: Brain, label: 'Intelligence' },
  { href: '/outreach', icon: Megaphone, label: 'Outreach' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold">LeadOS</span>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-800 pt-4 mt-4">
        <div className="px-3 py-2 text-xs text-gray-500">
          <div className="font-medium text-gray-400 mb-1">Gateway Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
