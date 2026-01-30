import React, { useState, useEffect } from 'react';
import { brandConfig } from './config';
import { AppMode } from './types';
import { Navigation } from './components/Navigation';
import { DealGenerator } from './components/DealGenerator';
import { AdminConsole } from './components/AdminConsole';
import { Home } from './components/Home';
import { Menu } from 'lucide-react';

import { HistoryViewer } from './components/HistoryViewer';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = brandConfig.meta.title;
  }, []);

  const renderContent = () => {
    switch (mode) {
      case AppMode.HOME:
        return <Home setMode={setMode} setSelectedDealId={setSelectedDealId} />;
      case AppMode.DEAL_GENERATOR:
        return <DealGenerator />;
      case AppMode.ADMIN:
        return <AdminConsole />;
      case AppMode.HISTORY_VIEWER:
        return (
          <HistoryViewer
            dealId={selectedDealId}
            onBack={() => {
              setMode(AppMode.HOME);
              setSelectedDealId(null);
            }}
          />
        );
      default:
        return <Home setMode={setMode} setSelectedDealId={setSelectedDealId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      {/* Sidebar */}
      <Navigation
        currentMode={mode}
        setMode={setMode}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        
        {/* Top User Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button 
                    className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(true)}
                >
                    <Menu size={24} />
                </button>
                {/* Optional: Breadcrumbs or Page Title could go here */}
            </div>

            {/* User Profile Area */}
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">{brandConfig.companyName} User</p>
                    <p className="text-xs text-gray-500">AI Lab Beta</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-[#004E91] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    SC
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {renderContent()}
        </main>

      </div>
    </div>
  );
}

export default App;
