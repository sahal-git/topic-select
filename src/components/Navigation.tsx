import React from 'react';
import { Home, Trophy } from 'lucide-react';
import { Team } from '../lib/supabase';

type View = 'home' | 'admin' | Team;

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors"
          >
            <div className="bg-primary-500 p-1.5 rounded-lg">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span>KHANDAQ '25</span>
          </button>
          
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
            
            {/* Home Button */}
            <button
              onClick={() => onViewChange('home')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm flex items-center gap-1 ${
                currentView === 'home'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Home</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
