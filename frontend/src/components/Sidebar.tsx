import React from 'react';
import {
  Home,
  LayoutDashboard,
  PieChart,
  TrendingDown,
  GitCommit,
  Layers,
  Zap,
  Cpu,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Scale,
  Calculator,
  Building,
  Brain,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';

export type NavTab =
  | 'home'
  | 'dashboard'
  | 'portfolio'
  | 'data-management'
  | 'credit-risk'
  | 'migration'
  | 'concentration'
  | 'stress-testing'
  | 'monte-carlo'
  | 'validation'
  | 'reports'
  | 'capital'
  | 'ifrs9'
  | 'underwriting'
  | 'ml-credit-risk';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const groups: NavGroup[] = [
    {
      heading: 'Portfolio & Overview',
      items: [
        { id: 'home', label: 'Website Home', icon: <Home className="w-4 h-4" /> },
        { id: 'dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'portfolio', label: 'Portfolio Analytics', icon: <PieChart className="w-4 h-4" /> },
        { id: 'data-management', label: 'Data Management', icon: <Database className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Regulatory & Capital',
      items: [
        { id: 'capital', label: 'Basel III/IV Capital & RWA', icon: <Scale className="w-4 h-4" /> },
        { id: 'ifrs9', label: 'IFRS 9 / CECL Provisions', icon: <Building className="w-4 h-4" /> },
        { id: 'underwriting', label: 'RAROC Deal Pricing Desk', icon: <Calculator className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Basel Pillar 1 Models',
      items: [
        { id: 'credit-risk', label: 'PD / LGD / EAD Risk', icon: <TrendingDown className="w-4 h-4" /> },
        { id: 'migration', label: 'Rating Migration', icon: <GitCommit className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Tail Risk & Stress',
      items: [
        { id: 'concentration', label: 'Concentration (HHI)', icon: <Layers className="w-4 h-4" /> },
        { id: 'stress-testing', label: 'Macro Stress Testing', icon: <Zap className="w-4 h-4" /> },
        { id: 'monte-carlo', label: 'Monte Carlo Simulation', icon: <Cpu className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'Governance & Reports',
      items: [
        { id: 'validation', label: 'Model Validation', icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'reports', label: 'Institutional Reports', icon: <FileText className="w-4 h-4" /> },
      ],
    },
    {
      heading: 'AI & Machine Learning',
      items: [
        { id: 'ml-credit-risk', label: 'ML Credit Risk Engine', icon: <Brain className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside className="w-64 lg:w-72 bg-white dark:bg-[#111827] border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col justify-between shrink-0 select-none min-h-screen sticky top-0 h-screen overflow-y-auto no-scrollbar transition-colors">
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div
          className="flex items-center space-x-3 cursor-pointer px-2 py-1"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EA580C] to-[#F59E0B] flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-[#111827] dark:text-white font-sans leading-tight">
              CreditRisk<span className="text-[#EA580C]">Engine</span>
            </span>
            <span className="text-[10px] text-[#6B7280] dark:text-neutral-400 font-medium tracking-wide">
              Institutional Basel Pillar 1
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <div className="space-y-4">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-neutral-500 font-mono">
                {group.heading}
              </h4>

              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                        isActive
                          ? "bg-[#18181B] dark:bg-[#2563EB] text-white shadow-xs"
                          : "text-[#6B7280] dark:text-neutral-400 hover:bg-black/[0.035] dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className={cn(isActive ? "text-white" : "text-[#9CA3AF] dark:text-neutral-500")}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
