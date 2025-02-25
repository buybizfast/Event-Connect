'use client';

import { Shield } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface VerificationBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerificationBadge({ size = 'md', className = '' }: VerificationBadgeProps) {
  // Size mappings
  const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Tooltip content="Verified Account">
      <div className={`text-blue-600 ${className}`}>
        <Shield className={`${sizeMap[size]}`} />
      </div>
    </Tooltip>
  );
} 