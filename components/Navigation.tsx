import React from 'react';
import { AppMode } from '../types';
import {
  Home,
  Tag,
  Settings,
  Layers,
  LayoutTemplate,
  Search,
  ChevronDown,
  ChevronRight,
  Grid,
  Star,
  Image,
  Box,
  Building2,
  Monitor,
  Calendar,
  BarChart2,
  Database,
  CheckCircle,
  Clock,
  Mail,
  Users,
  HelpCircle
} from 'lucide-react';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  favorites: AppMode[];
  onToggleFavorite: (mode: AppMode) => void;
  userRole: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentMode,
  setMode,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  favorites,
  onToggleFavorite,
  userRole
}) => {

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreativeExpanded, setIsCreativeExpanded] = React.useState(true);
  const [isAdminExpanded, setIsAdminExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'apps' | 'favorites'>('apps');

  const handleNavClick = (mode: AppMode | null) => {
    if (mode) setMode(mode);
    setIsMobileOpen(false);
  };

  const navItems = [
    { mode: AppMode.HOME, label: 'Dashboard', icon: Home, section: 'main' },
    { mode: AppMode.HELP_CENTER, label: 'Help Center', icon: HelpCircle, section: 'main' },
    { mode: AppMode.IMAGE_GENERATOR, label: 'Image Generator', icon: Tag, section: 'creative' },
    { mode: AppMode.IMAGE_RESIZER, label: 'Image Resizer', icon: Image, section: 'creative' },
    { mode: AppMode.TEMPLATE_TO_BANNER, label: 'Template Builder', icon: LayoutTemplate, section: 'creative' },
    { mode: AppMode.HISTORY_VIEWER, label: 'Theme History', icon: Clock, section: 'creative' },
    { mode: AppMode.ADMIN_COMPANIES, label: 'Companies', icon: Building2, section: 'admin' },
    { mode: AppMode.ADMIN_TEMPLATES, label: 'Templates', icon: LayoutTemplate, section: 'admin' },
    { mode: AppMode.ADMIN_IMAGE_SIZES, label: 'Image Sizes', icon: Monitor, section: 'admin' },
    { mode: AppMode.ADMIN_USERS, label: 'Users', icon: Users, section: 'admin' },
  ];

  const filteredItems = navItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderNavItem = (item: any) => (
    <div
      key={item.mode}
      className={`group relative flex items-center transition-colors
        ${currentMode === item.mode ? 'bg-[#003366] text-white' : 'text-gray-300 hover:bg-[#003366]/50'}
        ${isCollapsed ? 'justify-center' : ''}
      `}
    >
      <button
        onClick={() => handleNavClick(item.mode)}
        className={`flex-1 flex items-center px-4 py-2 text-sm
          ${isCollapsed ? 'justify-center px-2' : ''}
        `}
        title={isCollapsed ? item.label : ''}
      >
        <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
        {!isCollapsed && item.label}
      </button>
      {!isCollapsed && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.mode); }}
          className={`mr-2 p-1 rounded transition-all
            ${favorites.includes(item.mode)
              ? 'text-yellow-400'
              : 'text-gray-500 hover:text-yellow-400'
            }
          `}
          title={favorites.includes(item.mode) ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={14} fill={favorites.includes(item.mode) ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full bg-[#001F3F] text-white z-50 transition-all duration-300 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header / Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#003366] shrink-0 bg-[#001F3F]">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <img
                src="/albertsons-logo.png"
                alt="Albertsons"
                className="h-8 max-w-[40px] object-contain brightness-0 invert"
              />
              <span className="font-medium text-xs tracking-widest text-white uppercase whitespace-nowrap">MARKETING PORTAL</span>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto">
              <img
                src="/albertsons-logo.png"
                alt="Albertsons"
                className="h-8 w-8 object-contain brightness-0 invert"
              />
            </div>
          )}

          {!isCollapsed && (
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-blue-400 hover:text-white">
              <div className="rotate-45">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="transform rotate-0">
                  <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11V22H13V16H18V14L16,12Z" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Collapse Toggle (Visible only when collapsed to expand back?) 
             Actually user asked for "pin" image to collapse/expand. 
             If collapsed, we need a way to expand. Usually the header icon toggles it.
          */}
        {isCollapsed && (
          <div className="flex justify-center py-4 border-b border-[#003366]">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-blue-400 hover:text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11V22H13V16H18V14L16,12Z" />
              </svg>
            </button>
          </div>
        )}


        {/* Tabs: Apps | Favorites */}
        {!isCollapsed && (
          <div className="flex text-sm font-medium border-b border-[#003366]">
            <button
              onClick={() => setActiveTab('apps')}
              className={`flex-1 py-3 text-center flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'apps' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}
              `}
            >
              <Grid size={16} /> Apps
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 py-3 text-center flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'favorites' ? 'border-b-2 border-yellow-400 text-white' : 'text-gray-400 hover:text-white'}
              `}
            >
              <Star size={16} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} /> Favorites
            </button>
          </div>
        )}

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#003366] text-white pl-10 pr-4 py-2 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">

          {activeTab === 'favorites' && !isCollapsed ? (
            /* Favorites Tab Content */
            <div className="px-2">
              {navItems.filter(i => favorites.includes(i.mode)).length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Star size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No favorites yet</p>
                  <p className="text-xs mt-1 opacity-60">Click the ★ on any page to add it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {navItems.filter(i => favorites.includes(i.mode)).map(renderNavItem)}
                </div>
              )}
            </div>
          ) : (
            /* Apps Tab Content (default) */
            <>
              {/* Dashboard */}
              <div className={`mb-2 ${isCollapsed ? 'px-1' : 'px-2'}`}>
                {filteredItems.filter(i => i.section === 'main').map(renderNavItem)}
              </div>

              {/* Creative Tools Section */}
              {!searchQuery && !isCollapsed && (
                <div
                  onClick={() => setIsCreativeExpanded(!isCreativeExpanded)}
                  className="px-4 py-2 flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  Creative Tools {isCreativeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              )}
              {(isCreativeExpanded || searchQuery || isCollapsed) && (
                <div className={`mb-4 space-y-1 ${isCollapsed ? 'px-1' : 'px-2'}`}>
                  {filteredItems.filter(i => i.section === 'creative').map(renderNavItem)}
                </div>
              )}

              {/* Admin Section */}
              {userRole === 'admin' && (
                <div className={`mt-auto pt-4 border-t border-[#003366] ${isCollapsed ? 'px-1' : 'px-2'}`}>
                  {!searchQuery && !isCollapsed && (
                    <div
                      onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                      className="px-4 py-2 flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-white"
                    >
                      Administration {isAdminExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  )}
                  {(isAdminExpanded || searchQuery || isCollapsed) && (
                    <div className="space-y-1">
                      {filteredItems.filter(i => i.section === 'admin').map(renderNavItem)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </>
  );
};