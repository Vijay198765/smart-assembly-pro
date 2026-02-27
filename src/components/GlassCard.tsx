import { motion } from "motion/react";
import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Volume2, RefreshCw } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  onRegenerate?: () => void;
  onSpeak?: () => void;
  isLoading?: boolean;
}

export default function GlassCard({
  children,
  className,
  title,
  icon,
  onRegenerate,
  onSpeak,
  isLoading,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("glass-card p-6 relative overflow-hidden group flex flex-col h-full", className)}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          {icon && <div className="group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-color)' }}>{icon}</div>}
          {title && <h3 className="text-lg font-semibold tracking-tight">{title}</h3>}
        </div>
        <div className="flex items-center gap-1">
          {onSpeak && (
            <button
              onClick={onSpeak}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Listen to this section"
            >
              <Volume2 className="w-4 h-4 text-slate-400" />
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Generate/Refresh this section"
            >
              <RefreshCw className={cn("w-4 h-4 text-slate-400", isLoading && "animate-spin")} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-white/10 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-white/10 rounded animate-pulse w-5/6"></div>
          </div>
        ) : (
          <div className="relative z-10 flex-1">{children}</div>
        )}
      </div>

      {/* Decorative background element */}
      <div 
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ backgroundColor: 'var(--theme-color)' }}
      ></div>
    </motion.div>
  );
}
