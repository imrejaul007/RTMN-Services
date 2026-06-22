/**
 * Layout Component - Navigation & Sidebar
 */

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = '/dashboard';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">REZ Platform</span>
              </div>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <NavLink href="/dashboard" active>Dashboard</NavLink>
                <NavLink href="/companies">Companies</NavLink>
                <NavLink href="/users">Users</NavLink>
                <NavLink href="/services">Services</NavLink>
                <NavLink href="/finance">Finance</NavLink>
                <NavLink href="/technology">Tech</NavLink>
                <NavLink href="/marketing">Marketing</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <span>🔔</span>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-gray-500">Super Admin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
        active
          ? 'border-indigo-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`}
    >
      {children}
    </a>
  );
}
