import { Badge } from '@/components/ui/badge';
import { type TicketStatus, type PriorityLevel } from '@/lib/supabase';

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants: Record<TicketStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    OPEN: { variant: 'default', label: 'Open' },
    UNDER_REVIEW: { variant: 'secondary', label: 'Under Review' },
    CLOSED: { variant: 'outline', label: 'Closed' }
  };

  const config = variants[status] || variants.OPEN;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const variants: Record<PriorityLevel, { className: string; label: string }> = {
    LOW: { className: 'bg-muted text-muted-foreground', label: 'Low' },
    MEDIUM: { className: 'bg-info text-info-foreground', label: 'Medium' },
    HIGH: { className: 'bg-warning text-warning-foreground', label: 'High' },
    URGENT: { className: 'bg-destructive text-destructive-foreground', label: 'Urgent' }
  };

  const config = variants[priority] || variants.MEDIUM;

  return (
    <Badge className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}
