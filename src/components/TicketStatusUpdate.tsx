import { useState } from 'react';
import { supabase, type TicketStatus } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface TicketStatusUpdateProps {
  ticketId: string;
  currentStatus: TicketStatus;
  onStatusUpdated: () => void;
}

export function TicketStatusUpdate({ ticketId, currentStatus, onStatusUpdated }: TicketStatusUpdateProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<TicketStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is admin (dept or main) using profile role
  const isAdmin = profile?.role === 'main_admin' || profile?.role === 'dept_admin';

  console.log('TicketStatusUpdate - profile:', profile);
  console.log('TicketStatusUpdate - isAdmin:', isAdmin);

  if (!isAdmin) {
    return null;
  }

  const handleStatusUpdate = async () => {
    if (!user || newStatus === currentStatus) {
      return;
    }

    setLoading(true);
    try {
      // Update ticket status
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      // Create status history entry
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          ticket_id: ticketId,
          from_status: currentStatus,
          to_status: newStatus,
          changed_by: user.id,
          note: note.trim() || null
        });

      if (historyError) throw historyError;

      toast({
        title: 'Status Updated',
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}`,
      });

      setNote('');
      onStatusUpdated();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: TicketStatus[] = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Update Status
        </CardTitle>
        <CardDescription>
          Change the ticket status and add a note
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status">New Status</Label>
          <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TicketStatus)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'OPEN' && 'Open'}
                  {status === 'UNDER_REVIEW' && 'Under Review'}
                  {status === 'CLOSED' && 'Closed'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="Add a note about this status change..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleStatusUpdate} 
          disabled={loading || newStatus === currentStatus}
          className="w-full"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </CardContent>
    </Card>
  );
}
