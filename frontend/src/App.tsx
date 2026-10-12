import React, { useState } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PortfolioPage } from './pages/PortfolioPage';
import { BaselCapitalPage } from './pages/BaselCapitalPage';
import { IFRS9Page } from './pages/IFRS9Page';
import { UnderwritingPage } from './pages/UnderwritingPage';
import { CreditRiskPage } from './pages/CreditRiskPage';
import { MigrationPage } from './pages/MigrationPage';
import { ConcentrationPage } from './pages/ConcentrationPage';
import { StressTestingPage } from './pages/StressTestingPage';
import { MonteCarloPage } from './pages/MonteCarloPage';
import { ValidationPage } from './pages/ValidationPage';
import { ReportsPage } from './pages/ReportsPage';
import { HomePage } from './pages/HomePage';
import { MLCreditRiskPage } from './pages/MLCreditRiskPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { ShieldCheck, Scale, Database, Sun, Moon } from 'lucide-react';
import { useTheme } from './lib/theme';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex w-full antialiased font-sans bg-[#F8FAFC] dark:bg-[#0B0F17] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* 1. Left-Side Vertical Sidebar Navigation Menu */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Right-Side Main Application Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Sleek Top Breadcrumb & Status Bar */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] px-6 lg:px-8 py-3.5 flex items-center justify-between transition-colors">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#9CA3AF] dark:text-neutral-400">CreditRiskEngine</span>
            <span className="text-[#D1D5DB] dark:text-neutral-600">/</span>
            <span className="font-bold text-[#111827] dark:text-white capitalize">
              {activeTab === 'dashboard'
                ? 'Executive Overview'
                : activeTab === 'data-management'
                ? 'Data Management'
                : activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 px-3 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1F2937] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-2xs transition-all flex items-center gap-1.5 text-xs font-sans font-semibold cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-amber-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="hidden sm:inline text-neutral-700">Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={`flex-1 w-full ${activeTab === 'home' ? 'p-0 max-w-none' : 'p-6 lg:p-8 max-w-[1520px]'}`}>
          {activeTab === 'home' && <HomePage onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'portfolio' && <PortfolioPage />}
          {activeTab === 'data-management' && <DataManagementPage />}
          {activeTab === 'capital' && <BaselCapitalPage />}
          {activeTab === 'ifrs9' && <IFRS9Page />}
          {activeTab === 'underwriting' && <UnderwritingPage />}
          {activeTab === 'credit-risk' && <CreditRiskPage />}
          {activeTab === 'migration' && <MigrationPage />}
          {activeTab === 'concentration' && <ConcentrationPage />}
          {activeTab === 'stress-testing' && <StressTestingPage />}
          {activeTab === 'monte-carlo' && <MonteCarloPage />}
          {activeTab === 'validation' && <ValidationPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'ml-credit-risk' && <MLCreditRiskPage />}
        </main>

        {/* Footer */}
        <footer className="w-full bg-white dark:bg-[#111827] border-t border-black/[0.06] dark:border-white/[0.08] mt-auto py-6 px-6 lg:px-8 text-xs text-[#6B7280] dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between transition-colors">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-[#111827] dark:text-white">CreditRisk<span className="text-[#EA580C]">Engine</span></span>
            <span>&bull;</span>
            <span>Institutional Credit Risk & Basel Pillar 1 IRB Engine</span>
          </div>

          <div className="flex items-center space-x-4 pt-2 sm:pt-0 font-mono text-[11px] text-[#9CA3AF] dark:text-neutral-500">
            <span>BCBS 239 Compliant</span>
            <span>&bull;</span>
            <span>Fed SR 11-7 Validated</span>
            <span>&bull;</span>
            <span className="text-[#3B82F6] dark:text-[#60A5FA]">A-IRB Copula</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
