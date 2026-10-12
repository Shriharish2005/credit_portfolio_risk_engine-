import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface ZentraSubheaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const ZentraSubheader: React.FC<ZentraSubheaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 select-none">
      {/* Title with round link button */}
      <div className="flex items-center space-x-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827] font-sans">
          {title}
        </h1>
        <button
          className="w-7 h-7 rounded-full bg-white border border-black/[0.08] shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-neutral-50 transition-colors"
          title="Copy link"
          onClick={() => {
            if (navigator?.clipboard) {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        {subtitle && <span className="text-xs text-[#6B7280] hidden md:inline">&bull; {subtitle}</span>}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};
