'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Brain,
  Megaphone,
  Settings,
  Bot,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Intelligence', href: '/intelligence', icon: Brain },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(true)

  return (
    <aside className={cn(
      "flex flex-col border-r bg-card transition-all duration-300",
      expanded ? "w-64" : "w-16"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          {expanded && (
            <div className="flex flex-col">
              <span className="font-bold text-lg">REZ SalesMind</span>
              <span className="text-xs text-muted-foreground">AI-Powered Sales</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {expanded && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Status */}
      {expanded && (
        <div className="border-t p-4">
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">All systems operational</span>
          </div>
        </div>
      )}
    </aside>
  )
}
