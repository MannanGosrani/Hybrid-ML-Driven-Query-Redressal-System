import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type Ticket, type TicketComment, type StatusHistory, type Department } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import { AdminLayout } from '@/components/AdminLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Loader2, Clock } from 'lucide-react';
import { formatFullDate, formatRelativeTime } from '@/lib/ticketHelpers';
import { toast } from 'sonner';
import { TicketStatusUpdate } from '@/components/TicketStatusUpdate';

interface TicketWithDept extends Ticket {
  department?: Department;
}

interface CommentWithAuthor extends TicketComment {
  author?: { full_name: string; email: string };
}

interface HistoryWithUser extends StatusHistory {
  changer?: { full_name: string };
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<TicketWithDept | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [history, setHistory] = useState<HistoryWithUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingDept, setUpdatingDept] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTicketData();
      fetchDepartments();
    }
  }, [id, user]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchTicketData = async () => {
    if (!id || !user) return;

    setLoading(true);
    try {
      // Fetch ticket with department
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          department:departments(*)
        `)
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      
      // Check access - allow admins and the ticket owner
      const isAdmin = profile?.role === 'main_admin' || profile?.role === 'dept_admin';
      const isOwner = ticketData.student_id === user.id;
      
      if (!isAdmin && !isOwner) {
        toast.error('You do not have access to this ticket');
        navigate('/');
        return;
      }

      setTicket(ticketData);

      // Fetch comments with authors
      const { data: commentsData } = await supabase
        .from('ticket_comments')
        .select(`
          *,
          author:profiles(full_name, email)
        `)
        .eq('ticket_id', id)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);

      // Fetch status history
      const { data: historyData } = await supabase
        .from('status_history')
        .select(`
          *,
          changer:profiles(full_name)
        `)
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });

      setHistory(historyData || []);
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !ticket || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticket.id,
          author_id: user.id,
          body: newComment.trim(),
          is_internal: false
        });

      if (error) throw error;

      toast.success('Comment added');
      setNewComment('');
      fetchTicketData();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };


  const handleDepartmentChange = async (newDeptId: string) => {
    if (!ticket || !user || !profile) return;

    const oldDeptId = ticket.department_id;
    if (oldDeptId === newDeptId) return;

    setUpdatingDept(true);
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ department_id: newDeptId })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      // Get department names for the history note
      const oldDept = departments.find(d => d.id === oldDeptId);
      const newDept = departments.find(d => d.id === newDeptId);

      // Add status history
      await supabase.from('status_history').insert({
        ticket_id: ticket.id,
        from_status: ticket.status,
        to_status: ticket.status,
        changed_by: user.id,
        note: `Department changed from ${oldDept?.name || 'None'} to ${newDept?.name || 'Unknown'}`
      });

      toast.success('Department updated successfully');
      fetchTicketData();
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast.error('Failed to update department');
    } finally {
      setUpdatingDept(false);
    }
  };

  const isAdmin = profile?.role === 'main_admin' || profile?.role === 'dept_admin';
  const LayoutComponent = isAdmin ? AdminLayout : Layout;

  if (loading) {
    return (
      <LayoutComponent>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutComponent>
    );
  }

  if (!ticket) {
    return (
      <LayoutComponent>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ticket not found</p>
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="max-w-5xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tickets
        </Button>

        {/* Status Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              {/* Open */}
              <div className="flex-1 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  ticket.status === 'OPEN' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="text-sm font-semibold">1</span>
                </div>
                <span className="text-sm font-medium">Open</span>
                <span className="text-xs text-muted-foreground">Submitted</span>
              </div>
              
              {/* Connector */}
              <div className={`flex-1 h-0.5 ${
                ticket.status === 'UNDER_REVIEW' || ticket.status === 'CLOSED'
                  ? 'bg-primary' 
                  : 'bg-muted'
              }`} />
              
              {/* Under Review */}
              <div className="flex-1 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  ticket.status === 'UNDER_REVIEW' 
                    ? 'bg-primary text-primary-foreground' 
                    : ticket.status === 'CLOSED'
                    ? 'bg-primary/50 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="text-sm font-semibold">2</span>
                </div>
                <span className="text-sm font-medium">Under Review</span>
                <span className="text-xs text-muted-foreground">In Progress</span>
              </div>
              
              {/* Connector */}
              <div className={`flex-1 h-0.5 ${
                ticket.status === 'CLOSED'
                  ? 'bg-primary' 
                  : 'bg-muted'
              }`} />
              
              {/* Closed */}
              <div className="flex-1 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  ticket.status === 'CLOSED' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="text-sm font-semibold">3</span>
                </div>
                <span className="text-sm font-medium">Closed</span>
                <span className="text-xs text-muted-foreground">Resolved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_no}</span>
                </div>
                <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Created {formatRelativeTime(ticket.created_at)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{ticket.body}</p>
            </div>
            
            <Separator />
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Department:</span>
                {isAdmin ? (
                  <Select
                    value={ticket.department_id || 'unassigned'}
                    onValueChange={handleDepartmentChange}
                    disabled={updatingDept}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{ticket.department?.name || 'Not assigned'}</p>
                )}
              </div>
              {ticket.predicted_category && (
                <div>
                  <span className="text-muted-foreground">Auto-classified as:</span>
                  <p className="font-medium">{ticket.predicted_category}</p>
                </div>
              )}
              {ticket.resolution && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">Resolution:</span>
                  <p className="font-medium">{ticket.resolution}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Update - Only for Admins */}
        <TicketStatusUpdate 
          ticketId={id!} 
          currentStatus={ticket.status}
          onStatusUpdated={fetchTicketData}
        />

        {/* Status Timeline */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      </div>
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.to_status} />
                        <span className="text-sm text-muted-foreground">
                          {formatFullDate(item.created_at)}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-sm text-muted-foreground mt-1">{item.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-primary/20 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {comment.author?.full_name || comment.author?.email || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{newComment.length}/1000</span>
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  size="sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutComponent>
  );
}
