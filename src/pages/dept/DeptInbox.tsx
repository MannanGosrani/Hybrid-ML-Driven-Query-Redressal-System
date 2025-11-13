import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type TicketStatus } from '@/lib/supabase';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/ticketHelpers';
import { StatusBadge } from '@/components/StatusBadge';

interface TicketWithStudent {
  id: string;
  ticket_no: string;
  title: string;
  status: TicketStatus;
  created_at: string;
  student: {
    full_name: string;
    email: string;
  } | null;
}

export default function DeptInbox() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [allTickets, setAllTickets] = useState<TicketWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [departmentName, setDepartmentName] = useState<string>('');

  // Get the department ID from the profile
  const deptAdminDepartmentId = profile?.department_id;

  useEffect(() => {
    if (deptAdminDepartmentId) {
      fetchDepartmentName();
      fetchTickets();
    }
  }, [deptAdminDepartmentId]);

  const fetchDepartmentName = async () => {
    if (!deptAdminDepartmentId) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('id', deptAdminDepartmentId)
        .single();

      if (error) throw error;
      setDepartmentName(data?.name || '');
    } catch (error) {
      console.error('Error fetching department name:', error);
    }
  };

  const fetchTickets = async () => {
    if (!deptAdminDepartmentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_no,
          title,
          status,
          created_at,
          student:profiles!tickets_student_id_fkey(full_name, email)
        `)
        .eq('department_id', deptAdminDepartmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to handle single student object
      const transformedData = (data || []).map(ticket => ({
        ...ticket,
        student: Array.isArray(ticket.student) ? ticket.student[0] : ticket.student
      }));
      
      setAllTickets(transformedData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    return {
      all: allTickets.length,
      open: allTickets.filter(t => t.status === 'OPEN').length,
      review: allTickets.filter(t => t.status === 'UNDER_REVIEW').length,
      closed: allTickets.filter(t => t.status === 'CLOSED').length,
    };
  };

  const getFilteredTickets = () => {
    if (activeTab === 'all') return allTickets;
    if (activeTab === 'open') return allTickets.filter(t => t.status === 'OPEN');
    if (activeTab === 'review') return allTickets.filter(t => t.status === 'UNDER_REVIEW');
    if (activeTab === 'closed') return allTickets.filter(t => t.status === 'CLOSED');
    return allTickets;
  };

  const stats = getStats();
  const tickets = getFilteredTickets();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{departmentName} - Department Inbox</h1>
          <p className="text-muted-foreground">Manage tickets for the {departmentName} department</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Tickets</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.all}</div>
              <p className="text-xs text-muted-foreground">Total tickets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.review}</div>
              <p className="text-xs text-muted-foreground">Being reviewed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.closed}</div>
              <p className="text-xs text-muted-foreground">Completed tickets</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({stats.all})
            </TabsTrigger>
            <TabsTrigger value="open">
              Open ({stats.open})
            </TabsTrigger>
            <TabsTrigger value="review">
              Under Review ({stats.review})
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed ({stats.closed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No tickets found</p>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'all' && 'No tickets in this department yet'}
                    {activeTab === 'open' && 'All tickets are either under review or closed'}
                    {activeTab === 'review' && 'No tickets are under review'}
                    {activeTab === 'closed' && 'No closed tickets yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{ticket.ticket_no}</Badge>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          <CardDescription className="mt-2">
                            Submitted by {ticket.student?.full_name || 'Unknown'} • {formatRelativeTime(ticket.created_at)}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
