import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  color = 'blue',
}) => {
  const colorMap = {
    blue: {
      accent: 'card-accent-blue',
      iconBox: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
      badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
      hoverBorder: 'hover:border-cyan-500/40',
    },
    emerald: {
      accent: 'card-accent-emerald',
      iconBox: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      hoverBorder: 'hover:border-emerald-500/40',
    },
    amber: {
      accent: 'card-accent-amber',
      iconBox: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      hoverBorder: 'hover:border-amber-500/40',
    },
    rose: {
      accent: 'card-accent-rose',
      iconBox: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      hoverBorder: 'hover:border-rose-500/40',
    },
    purple: {
      accent: 'card-accent-purple',
      iconBox: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      badge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
      hoverBorder: 'hover:border-purple-500/40',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`risk-card p-5 risk-card-hover ${scheme.accent} ${scheme.hoverBorder} flex flex-col justify-between group`}>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className={`p-2 rounded-xl border ${scheme.iconBox} shadow-sm group-hover:scale-105 transition-transform`}>
              {icon}
            </div>
          )}
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{value}</div>
          {badge && (
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${scheme.badge}`}>
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="mt-2 text-[11px] text-muted-foreground font-sans leading-relaxed border-t border-border/80 pt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};
