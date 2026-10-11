import React from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'default' | 'lg' | string;
}

export function Card({ className, hoverEffect = false, padding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900/90 text-granite-900 dark:text-granite-100 shadow-sm backdrop-blur-sm transition-all duration-200',
        hoverEffect && 'hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold tracking-tight text-granite-900 dark:text-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-granite-500 dark:text-granite-400', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 pt-2', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-5 pt-0 border-t border-granite-100 dark:border-granite-800/60 mt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
