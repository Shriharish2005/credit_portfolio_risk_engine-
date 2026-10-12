import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Play,
  Home,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../lib/theme';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { theme, toggleTheme } = useTheme();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const checkHealth = () => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => setIsHealthy(data.status === 'healthy'))
      .catch(() => setIsHealthy(false));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    checkHealth();
    setTimeout(() => setRefreshing(false), 600);
  };

  const primaryLinks = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'capital', label: 'Basel Capital' },
    { id: 'ifrs9', label: 'IFRS 9 ECL' },
    { id: 'underwriting', label: 'RAROC Desk' },
    { id: 'credit-risk', label: 'Risk Models' },
    { id: 'migration', label: 'Migration' },
    { id: 'stress-testing', label: 'Stress Testing' },
    { id: 'monte-carlo', label: 'Monte Carlo' },
    { id: 'validation', label: 'Validation' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md">
      {/* Everything tightly aligned to the LEFT side without justify-between or mx-auto */}
      <div className="h-16 px-6 w-full flex items-center justify-start gap-4 overflow-x-auto no-scrollbar">
        {/* 1. Brand Identity on Left Edge */}
        <div
          className="flex items-center space-x-3 cursor-pointer shrink-0 group select-none pr-2 border-r border-border"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-foreground whitespace-nowrap font-sans">
                Credit Risk Engine
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-semibold leading-none whitespace-nowrap">
                BASEL III
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Quantitative Risk & Capital Platform
            </span>
          </div>
        </div>

        {/* 2. Navigation Links immediately following on the Left */}
        <nav className="flex items-center space-x-1 text-xs font-medium shrink-0">
          {primaryLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="h-5 w-px bg-border shrink-0" />

        {/* 3. Database Status & Action Buttons directly on the Left */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="flex items-center space-x-2 text-xs font-mono px-2.5 py-1.5 rounded-md border border-border bg-muted/40 whitespace-nowrap">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">PostgreSQL 17</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy === true
                  ? 'bg-emerald-400 animate-pulse'
                  : isHealthy === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
          </div>

          {activeTab === 'home' ? (
            <Button
              size="sm"
              className="h-9 px-4 gap-1.5 font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm whitespace-nowrap"
              onClick={() => setActiveTab('dashboard')}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Terminal</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 font-semibold text-xs whitespace-nowrap"
              onClick={() => setActiveTab('home')}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            title="Refresh quantitative engine state"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </Button>

          {/* Dark / Light Mode Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="h-8 w-8 text-foreground hover:bg-muted shrink-0 border-border"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
