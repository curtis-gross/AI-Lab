import React, { useState } from 'react';
import { AppMode } from '../types';
import {
  Menu,
  Home,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
    currentMode, 
    setMode, 
    isCollapsed, 
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen
}) => {

  const navItems = [
    { id: AppMode.HOME, label: 'Home', icon: Home },
    { id: AppMode.DEAL_GENERATOR, label: 'Deal Generator', icon: Tag },
    { id: AppMode.DEAL_RESIZER, label: 'Deal Resizer', icon: Layers },
    { id: AppMode.ADMIN, label: 'Admin Console', icon: Settings },
  ];

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
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-sm z-50 transition-all duration-300 flex flex-col
        ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        {/* Sidebar Header / Logo Area */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-gray-100 shrink-0 transition-all`}>
            {isCollapsed ? (
                <span className="text-2xl font-bold text-[#004E91]">AI</span>
            ) : (
                <span className="text-2xl font-bold text-[#004E91]">AI Lab</span>
            )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 space-y-2 overflow-y-auto px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setMode(item.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  w-full flex items-center rounded-lg transition-colors duration-200
                  ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 space-x-3'}
                  ${isActive
                    ? 'bg-[#004E91] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={20} />
                {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle (Desktop) */}
        <div className="hidden md:flex p-4 border-t border-gray-100 justify-end">
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
        </div>
      </nav>
    </>
  );
};