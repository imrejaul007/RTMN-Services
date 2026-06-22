import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Shield, Users, Building2, AlertTriangle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "REZ Trust Admin - Trust Management Dashboard",
  description: "Comprehensive trust management, fraud detection, and BNPL risk assessment for RTNM-Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="h-8 w-8 text-green-400" />
              <div>
                <h1 className="font-bold text-lg">REZ Trust</h1>
                <p className="text-xs text-slate-400">Admin Dashboard</p>
              </div>
            </div>

            <nav className="space-y-2 flex-1">
              <NavLink href="/" icon={<Shield className="h-5 w-5" />} label="Overview" />
              <NavLink href="/users" icon={<Users className="h-5 w-5" />} label="Users" />
              <NavLink href="/merchants" icon={<Building2 className="h-5 w-5" />} label="Merchants" />
              <NavLink href="/fraud" icon={<AlertTriangle className="h-5 w-5" />} label="Fraud Detection" />
            </nav>

            <div className="pt-6 border-t border-slate-700">
              <div className="text-xs text-slate-400">
                <p>RTNM-Group</p>
                <p>v1.0.0</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 bg-slate-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
