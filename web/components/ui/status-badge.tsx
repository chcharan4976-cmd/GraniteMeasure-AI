'use client';

import React from 'react';
import { Badge, BadgeProps } from './badge';
import { useTranslation } from '@/localization';

export type EntityStatus =
  | 'REGISTERED'
  | 'CAPTURING'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'MEASURED'
  | 'ASSESSED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | string;

export interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getStatusVariant = (st: string): BadgeProps['variant'] => {
    switch (st.toUpperCase()) {
      case 'REGISTERED':
        return 'default';
      case 'CAPTURING':
      case 'UPLOADED':
        return 'info';
      case 'PROCESSING':
      case 'RUNNING':
        return 'processing';
      case 'MEASURED':
      case 'ASSESSED':
        return 'warning';
      case 'APPROVED':
      case 'COMPLETED':
      case 'DISPATCHED':
        return 'success';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const statusLabel = t(`status.${status}`, status);

  return (
    <Badge
      variant={getStatusVariant(status)}
      dot
      className={className}
    >
      {statusLabel}
    </Badge>
  );
}
