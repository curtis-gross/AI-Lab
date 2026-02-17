import React, { useState, useEffect } from 'react';
import { brandConfig } from './config';
import { AppMode, User, GeneratedResult } from './types';
import { useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageResizer } from './components/ImageResizer';
import { TemplateToBanner } from './components/TemplateToBanner';
import { AdminCompanies } from './components/AdminCompanies';
import { AdminTemplates } from './components/AdminTemplates';
import { AdminSizes } from './components/AdminSizes';
import { Home } from './components/Home';
import { LoginScreen } from './components/LoginScreen';
import { Menu, LogIn, Loader2, Share2 } from 'lucide-react';
import { generateImageWithAssets } from './services/geminiService';

import { HistoryViewer } from './components/HistoryViewer';
import { HistoryList } from './components/HistoryList';
import { AdminUsers } from './components/AdminUsers';
import { HelpCenter } from './components/HelpCenter';

interface ActiveResizeTask {
  status: 'idle' | 'processing' | 'completed';
  progress: string;
  results: GeneratedResult[];
  totalSizes: number;
  completedSizes: number;
}

function App() {
  const [mode, setMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    return (modeParam && Object.values(AppMode).includes(modeParam as AppMode)) 
      ? (modeParam as AppMode) 
      : AppMode.HOME;
  });

  const [selectedImageId, setSelectedImageId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('id');
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User State - Default to Guest
  const [user, setUser] = useState<User>({
    username: 'guest',
    name: 'Guest User',
    initials: 'G',
    role: 'guest'
  });

  // Background Resize Task State
  const [resizeTask, setResizeTask] = useState<ActiveResizeTask>({
    status: 'idle',
    progress: '',
    results: [],
    totalSizes: 0,
    completedSizes: 0
  });

  // Favorites State
  const [favorites, setFavorites] = useState<AppMode[]>([]);

  const fetchFavorites = useCallback(async (username: string) => {
    try {
      const res = await fetch(`/api/favorites/${username}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (err) {
      console.error('Failed to fetch favorites', err);
    }
  }, []);

  const toggleFavorite = useCallback(async (mode: AppMode) => {
    const updated = favorites.includes(mode)
      ? favorites.filter(f => f !== mode)
      : [...favorites, mode];
    setFavorites(updated);

    try {
      await fetch(`/api/favorites/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: updated })
      });
    } catch (err) {
      console.error('Failed to save favorites', err);
    }
  }, [favorites, user.username]);

  useEffect(() => {
    document.title = brandConfig.meta.title;

    // Polling for active jobs
    const pollJobs = async () => {
      try {
        const res = await fetch('/api/resizer/jobs');
        const jobs = await res.json();

        // For simplicity, we just track the most recent active job globally in the header
        const activeJob = jobs.find((j: any) => j.status === 'processing');
        if (activeJob) {
          setResizeTask({
            status: 'processing',
            progress: activeJob.progress,
            results: activeJob.results,
            totalSizes: activeJob.totalCount,
            completedSizes: activeJob.completedCount
          });
        } else {
          // Check if the current task in state was processing and just finished
          // We don't want to clear it instantly if it just completed
          setResizeTask(prev => {
            if (prev.status === 'processing') {
              return { ...prev, status: 'completed', progress: 'All resizes completed!' };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to poll jobs", err);
      }
    };

    const interval = setInterval(pollJobs, 3000);
    return () => clearInterval(interval);
  }, []);



  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (selectedImageId) {
      params.set('id', selectedImageId);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, [mode, selectedImageId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert("Link copied to clipboard!"))
      .catch(err => console.error("Failed to copy link: ", err));
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setMode(AppMode.HOME);
    fetchFavorites(loggedInUser.username);
  };

  const handleLogout = () => {
    setUser({
      username: 'guest',
      name: 'Guest User',
      initials: 'G',
      role: 'guest'
    });
    setFavorites([]);
    setMode(AppMode.HOME);
  };

  const startResizeTask = async (uploadedBanner: string, targetSizes: any[], promptGuidance: string) => {
    try {
      setResizeTask({
        status: 'processing',
        progress: 'Enqueuing job...',
        results: [],
        totalSizes: targetSizes.length,
        completedSizes: 0
      });

      const res = await fetch('/api/resizer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadedBanner, targetSizes, promptGuidance })
      });

      if (!res.ok) throw new Error("Failed to start job on server");

      // Polling will take over from here to show progress
    } catch (error: any) {
      console.error("Error starting resizer job:", error);
      alert("Failed to start resize task: " + error.message);
      setResizeTask(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.LOGIN:
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case AppMode.HOME:
        return <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
      case AppMode.IMAGE_GENERATOR:
        return <ImageGenerator />;
      case AppMode.IMAGE_RESIZER:
        return <ImageResizer activeTask={resizeTask} onStartResize={startResizeTask} />;
      case AppMode.TEMPLATE_TO_BANNER:
        return <TemplateToBanner />;
      case AppMode.ADMIN_COMPANIES:
        return user.role === 'admin' ? <AdminCompanies /> : <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
      case AppMode.ADMIN_TEMPLATES:
        return user.role === 'admin' ? <AdminTemplates /> : <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
      case AppMode.ADMIN_IMAGE_SIZES:
        return user.role === 'admin' ? <AdminSizes /> : <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
      case AppMode.HISTORY_VIEWER:
        if (selectedImageId) {
          return (
            <HistoryViewer
              imageId={selectedImageId}
              onBack={() => setSelectedImageId(null)}
            />
          );
        }
        return (
          <HistoryList
            onViewItem={(id) => setSelectedImageId(id)}
          />
        );
      case AppMode.ADMIN_USERS:
        return user.role === 'admin' ? <AdminUsers /> : <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
      case AppMode.HELP_CENTER:
        return <HelpCenter />;
      default:
        return <Home setMode={setMode} setSelectedImageId={setSelectedImageId} />;
    }
  };

  // If in Login Mode, render full screen login without layout
  if (mode === AppMode.LOGIN) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex text-[#333333]">
      {/* Sidebar */}
      <Navigation
        currentMode={mode}
        setMode={setMode}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        userRole={user.role}
      />

      {/* Main Content Area - Dynamic sidebar width */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            {/* Header Title */}
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-widest text-gray-500 uppercase flex items-center gap-3">
                Marketing Portal
                {resizeTask.status === 'processing' && (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] normal-case tracking-normal border border-blue-100 animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    Resizing in background: {resizeTask.completedSizes}/{resizeTask.totalSizes}
                  </div>
                )}
              </h1>
              {mode !== AppMode.HOME && (
                <span className="text-xs text-gray-400">
                  Session ID: {Math.random().toString(36).substring(7)}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Help & User */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleShare}
              className="text-gray-500 hover:text-[#00529b] transition-colors"
              title="Share this page"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={() => setMode(AppMode.HELP_CENTER)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-[#00529b] transition-colors text-sm font-medium"
              title="Help Center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
              <span>Help</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#7CA1B3] text-white flex items-center justify-center font-semibold text-sm">
                {user.initials}
              </div>
              <div className="flex flex-col leading-tight text-sm">
                <span className="font-bold text-gray-800">{user.name}</span>
                {user.role === 'guest' ? (
                  <button
                    onClick={() => setMode(AppMode.LOGIN)}
                    className="text-xs text-blue-600 hover:underline text-left font-medium flex items-center gap-1"
                  >
                    Sign In <LogIn size={10} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{user.username.toUpperCase()}</span>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] text-red-500 hover:underline font-medium"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
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
