import React from 'react';
import {
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface ZentraNavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const ZentraNavbar: React.FC<ZentraNavbarProps> = ({ activeTab, setActiveTab }) => {
  const primaryTabs: { id: NavTab; label: string; badge?: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio', badge: '50k' },
    { id: 'capital', label: 'Basel Capital', badge: 'A-IRB' },
    { id: 'ifrs9', label: 'IFRS 9 ECL', badge: 'SICR' },
    { id: 'underwriting', label: 'RAROC Desk' },
    { id: 'credit-risk', label: 'PD / LGD' },
    { id: 'stress-testing', label: 'Stress Testing' },
  ];

  const secondaryTabs: { id: NavTab; label: string; badge?: string }[] = [
    { id: 'migration', label: 'Rating Migration', badge: 'Markov' },
    { id: 'concentration', label: 'Concentration (HHI)', badge: 'HHI' },
    { id: 'monte-carlo', label: 'Monte Carlo Simulation', badge: 'Copula' },
    { id: 'validation', label: 'Model Validation', badge: 'PSI' },
    { id: 'reports', label: 'Institutional Reports' },
  ];

  const [isMoreOpen, setIsMoreOpen] = React.useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSecondaryActive = secondaryTabs.some((t) => t.id === activeTab);
  const activeSecondaryItem = secondaryTabs.find((t) => t.id === activeTab);

  return (
    <div className="w-full flex items-center justify-between select-none">
      {/* Left: Credit Portfolio Risk Engine Brand */}
      <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
        {/* Brand Rounded Square Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EA580C] to-[#F59E0B] flex items-center justify-center shadow-xs">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight text-[#111827] font-sans leading-tight">
            CreditRisk<span className="text-[#EA580C]">Engine</span>
          </span>
          <span className="text-[10px] text-[#6B7280] font-medium tracking-wide">
            Institutional Portfolio Risk & Basel Pillar 1
          </span>
        </div>
      </div>

      {/* Center: Horizontal Capsule Nav Pill Bar (Never clips or cuts off) */}
      <nav className="flex items-center space-x-1.5 flex-wrap justify-center py-1 px-2">
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMoreOpen(false);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-[#18181B] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-black/[0.04]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/[0.06] text-[#6B7280]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* More Models Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              isSecondaryActive
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-black/[0.04]'
            }`}
          >
            <span>{isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.label : 'More Models'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Floating Dropdown Menu */}
          {isMoreOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">
                Advanced Analytics
              </div>
              {secondaryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMoreOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-black/[0.06] text-[#111827] font-bold'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-black/[0.03]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-black/[0.05] text-[#6B7280] font-mono">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};
