/**
 * LEO Frontend - SystemStatusCard Component
 * Clickable status card for system components (Agents, Pipeline, Memory)
 */

import { type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export type SystemStatus = 'healthy' | 'degraded' | 'error' | 'offline' | 'maintenance';

export interface SystemStatusCardProps {
  /** Card title */
  title: string;
  /** Link destination */
  to: string;
  /** Icon component */
  icon: LucideIcon;
  /** Main display value */
  value: string | number;
  /** Status for color coding */
  status?: SystemStatus;
  /** Additional details to show below value */
  details?: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// Status Styling
// ============================================================================

const statusColors: Record<SystemStatus, string> = {
  healthy: 'text-green-500',
  degraded: 'text-yellow-500',
  error: 'text-red-500',
  offline: 'text-gray-500',
  maintenance: 'text-blue-500',
};

const statusLabels: Record<SystemStatus, string> = {
  healthy: 'Operativo',
  degraded: 'Degradato',
  error: 'Errore',
  offline: 'Offline',
  maintenance: 'Manutenzione',
};

// ============================================================================
// Component
// ============================================================================

/**
 * SystemStatusCard - Clickable card showing system component status
 *
 * @example
 * <SystemStatusCard
 *   title="Agenti"
 *   to="/agents"
 *   icon={Bot}
 *   value="3/5"
 *   status="healthy"
 *   details={<span>3 attivi, 1 inattivo</span>}
 * />
 */
export function SystemStatusCard({
  title,
  to,
  icon: Icon,
  value,
  status,
  details,
  isLoading = false,
  className,
}: SystemStatusCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayValue = status
    ? statusLabels[status]
    : (typeof value === 'number' ? value.toLocaleString() : value);

  return (
    <Link to={to}>
      <Card className={cn(
        'hover:border-primary transition-colors cursor-pointer h-full',
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-2xl font-bold',
            status && statusColors[status]
          )}>
            {displayValue}
          </div>
          {details && (
            <div className="flex gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
              {details}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * AgentStatusDetails - Helper component for agent status details
 */
export function AgentStatusDetails({
  active,
  idle,
  error,
}: {
  active: number;
  idle: number;
  error: number;
}) {
  return (
    <>
      <span className="text-green-500">{active} attivi</span>
      <span className="text-yellow-500">{idle} inattivi</span>
      {error > 0 && <span className="text-red-500">{error} errori</span>}
    </>
  );
}

/**
 * PipelineStatusDetails - Helper component for pipeline status details
 */
export function PipelineStatusDetails({
  activeRuns,
  avgLatency,
}: {
  activeRuns: number;
  avgLatency: number;
}) {
  return (
    <>
      <span>{activeRuns} esecuzioni attive</span>
      <span>|</span>
      <span>Latenza: {avgLatency}ms</span>
    </>
  );
}

/**
 * MemoryStatusDetails - Helper component for memory status details
 */
export function MemoryStatusDetails({
  cacheHitRate,
}: {
  totalEntries?: number;
  cacheHitRate: number;
}) {
  return (
    <>
      <span>entries totali</span>
      <span>|</span>
      <span className="text-green-500">Cache hit: {cacheHitRate.toFixed(1)}%</span>
    </>
  );
}

export default SystemStatusCard;
