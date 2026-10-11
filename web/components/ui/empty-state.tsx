import React from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-granite-300 dark:border-granite-800 p-8 text-center bg-granite-50/50 dark:bg-granite-900/30',
        className
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-granite-100 dark:bg-granite-800 text-granite-500 dark:text-granite-400 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-granite-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-granite-500 dark:text-granite-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          size="sm"
          className="mt-5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
