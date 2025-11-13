import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Ticket {
  id: string;
  ticket_no: string;
  title: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';
  created_at: string;
  student: { full_name: string; email: string } | null;
  department: { name: string } | null;
}

export default function AllTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [departmentFilter, setDepartmentFilter] = useState<string>(searchParams.get('department') || 'all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsResult, departmentsResult] = await Promise.all([
        supabase
          .from('tickets')
          .select(`
            id,
            ticket_no,
            title,
            status,
            created_at,
            profiles!tickets_student_id_fkey(full_name, email),
            departments(name)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name').order('name')
      ]);

      if (ticketsResult.error) throw ticketsResult.error;
      
      const formattedTickets = (ticketsResult.data || []).map((ticket: any) => ({
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        title: ticket.title,
        status: ticket.status,
        created_at: ticket.created_at,
        student: ticket.profiles,
        department: ticket.departments
      }));
      
      setTickets(formattedTickets);
      setDepartments(departmentsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    setSearchParams(params);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('department');
    } else {
      params.set('department', value);
    }
    setSearchParams(params);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticket_no.toLowerCase().includes(search.toLowerCase()) ||
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.student?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      ticket.department?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || ticket.department?.name === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">All Tickets</h1>
            <p className="text-muted-foreground">View and manage tickets from all departments</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket #, title, student, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] bg-background border-input shadow-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all" className="cursor-pointer">All Status</SelectItem>
                <SelectItem value="OPEN" className="cursor-pointer">Open</SelectItem>
                <SelectItem value="UNDER_REVIEW" className="cursor-pointer">Under Review</SelectItem>
                <SelectItem value="CLOSED" className="cursor-pointer">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="w-[200px] bg-background border-input shadow-sm">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all" className="cursor-pointer">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name} className="cursor-pointer">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {filteredTickets.length} Ticket{filteredTickets.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No tickets found</p>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {ticket.ticket_no}
                        </span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <h3 className="font-semibold">{ticket.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Student: {ticket.student?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>Department: {ticket.department?.name || 'Unassigned'}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
