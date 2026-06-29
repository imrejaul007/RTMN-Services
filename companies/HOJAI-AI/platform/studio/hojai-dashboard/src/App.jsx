import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bot, Workflow, Users, Settings,
  MessageSquare, CreditCard, Shield, BarChart3, Bell
} from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Connectors from './pages/Connectors';
import Services from './pages/Services';
import Integrations from './pages/Integrations';
import Analytics from './pages/Analytics';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white">
          <div className="p-4 border-b border-slate-700">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bot className="w-6 h-6 text-purple-400" />
              HOJAI
            </h1>
            <p className="text-xs text-slate-400 mt-1">AI Workforce Platform</p>
          </div>

          <nav className="p-4 space-y-1">
            <NavLink to="/" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </NavLink>

            <NavLink to="/connectors" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <Workflow className="w-5 h-5" />
              Connectors
            </NavLink>

            <NavLink to="/services" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <Bot className="w-5 h-5" />
              Services
            </NavLink>

            <NavLink to="/integrations" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <Users className="w-5 h-5" />
              Integrations
            </NavLink>

            <NavLink to="/analytics" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <BarChart3 className="w-5 h-5" />
              Analytics
            </NavLink>

            <NavLink to="/settings" className={({isActive}) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }>
              <Settings className="w-5 h-5" />
              Settings
            </NavLink>
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              All systems operational
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connectors" element={<Connectors />} />
            <Route path="/services" element={<Services />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
