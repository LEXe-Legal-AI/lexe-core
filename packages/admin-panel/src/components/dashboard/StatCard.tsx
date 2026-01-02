/**
 * LEO Frontend - StatCard Component
 * Reusable statistics card with trend indicator
 */

import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon component to show */
  icon: LucideIcon;
  /** Change percentage (e.g., "+12.5%" or "-3.1%") */
  change?: string;
  /** Trend direction for styling */
  trend?: 'up' | 'down' | 'neutral';
  /** Description text shown after the change */
  changeDescription?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * StatCard - Displays a statistic with optional trend indicator
 *
 * @example
 * <StatCard
 *   title="Total Conversations"
 *   value="2,847"
 *   icon={MessageSquare}
 *   change="+12.5%"
 *   trend="up"
 *   changeDescription="rispetto a ieri"
 * />
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  trend = 'neutral',
  changeDescription = 'rispetto a ieri',
  isLoading = false,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {change && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend !== 'neutral' && (
              <TrendIcon className={cn('mr-1 h-3 w-3', trendColors[trend])} />
            )}
            <span className={trendColors[trend]}>{change}</span>
            {changeDescription && (
              <span className="ml-1">{changeDescription}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
