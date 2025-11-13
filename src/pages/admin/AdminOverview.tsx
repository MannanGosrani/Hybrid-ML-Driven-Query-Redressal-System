import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { BarChart3, Users, Ticket, AlertCircle, CheckCircle2, Clock, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Stats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalStudents: number;
  totalDepartments: number;
}

interface TicketData {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  created_at: string;
  student: {
    full_name: string;
    email: string;
  };
  department: {
    name: string;
  };
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [ticketsResult, students, departmentsResult] = await Promise.all([
        supabase.from('tickets').select(`
          id,
          ticket_no,
          title,
          status,
          created_at,
          student:profiles!tickets_student_id_fkey(full_name, email),
          department:departments(name)
        `).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('departments').select('id, name').order('name')
      ]);

      const ticketsData = ticketsResult.data || [];
      const transformedTickets = ticketsData.map(ticket => ({
        ...ticket,
        student: Array.isArray(ticket.student) ? ticket.student[0] : ticket.student,
        department: Array.isArray(ticket.department) ? ticket.department[0] : ticket.department
      }));

      const openCount = ticketsData.filter(t => t.status === 'OPEN').length;
      const inProgressCount = ticketsData.filter(t => t.status === 'UNDER_REVIEW').length;
      const resolvedCount = ticketsData.filter(t => t.status === 'CLOSED').length;

      setTickets(transformedTickets);
      setDepartments(departmentsResult.data || []);
      setStats({
        totalTickets: ticketsData.length,
        openTickets: openCount,
        inProgressTickets: inProgressCount,
        resolvedTickets: resolvedCount,
        totalStudents: students.count || 0,
        totalDepartments: departmentsResult.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTickets = () => {
    if (activeTab === 'all') return tickets;
    if (activeTab === 'open') return tickets.filter(t => t.status === 'OPEN');
    if (activeTab === 'review') return tickets.filter(t => t.status === 'UNDER_REVIEW');
    if (activeTab === 'closed') return tickets.filter(t => t.status === 'CLOSED');
    return tickets;
  };

  // Get filtered tickets for the selected department (for bar chart only)
  const getDepartmentFilteredTickets = () => {
    if (selectedDepartment === 'all') return tickets;
    return tickets.filter(t => t.department?.name === selectedDepartment);
  };

  const departmentTickets = getDepartmentFilteredTickets();

  // Pie chart - always shows all departments
  const pieChartData = [
    { name: 'Open', value: stats?.openTickets || 0, color: 'hsl(25, 95%, 53%)' },
    { name: 'Under Review', value: stats?.inProgressTickets || 0, color: 'hsl(221, 83%, 53%)' },
    { name: 'Closed', value: stats?.resolvedTickets || 0, color: 'hsl(142, 71%, 45%)' }
  ];

  // Bar chart - filtered by selected department
  const barChartData = [
    { name: 'Open', value: departmentTickets.filter(t => t.status === 'OPEN').length, color: 'hsl(25, 95%, 53%)' },
    { name: 'Under Review', value: departmentTickets.filter(t => t.status === 'UNDER_REVIEW').length, color: 'hsl(221, 83%, 53%)' },
    { name: 'Closed', value: departmentTickets.filter(t => t.status === 'CLOSED').length, color: 'hsl(142, 71%, 45%)' }
  ];

  const chartConfig = {
    open: { label: 'Open', color: 'hsl(25, 95%, 53%)' },
    review: { label: 'Under Review', color: 'hsl(221, 83%, 53%)' },
    closed: { label: 'Closed', color: 'hsl(142, 71%, 45%)' }
  };

  // Get department-wise status breakdown for stacked chart
  const departmentStatusData = Object.entries(
    tickets.reduce((acc, ticket) => {
      const deptName = ticket.department?.name || 'Unknown';
      if (!acc[deptName]) {
        acc[deptName] = { name: deptName, OPEN: 0, UNDER_REVIEW: 0, CLOSED: 0 };
      }
      acc[deptName][ticket.status as keyof typeof acc[typeof deptName]]++;
      return acc;
    }, {} as Record<string, { name: string; OPEN: number; UNDER_REVIEW: number; CLOSED: number }>)
  )
    .map(([, data]) => {
      const total = data.OPEN + data.UNDER_REVIEW + data.CLOSED;
      return { ...data, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const filteredTickets = getFilteredTickets();

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    description: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Comprehensive system statistics and insights</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tickets"
            value={stats?.totalTickets || 0}
            icon={Inbox}
            description="All tickets in the system"
          />
          <StatCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            description="Registered students"
          />
          <StatCard
            title="Departments"
            value={stats?.totalDepartments || 0}
            icon={Ticket}
            description="Active departments"
          />
          <StatCard
            title="Resolution Rate"
            value={stats?.totalTickets ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0}
            icon={BarChart3}
            description="Percentage of closed tickets"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Overall Distribution</CardTitle>
              <CardDescription>Total tickets across all departments</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Status Breakdown</CardTitle>
                  <CardDescription>Tickets by current status</CardDescription>
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background border-input shadow-sm">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all" className="cursor-pointer">
                      <span className="font-medium">All Departments</span>
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name} className="cursor-pointer">
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        cursor={{ fill: 'hsl(var(--muted)/20)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[8, 8, 0, 0]}
                        onClick={(data) => {
                          const status = data.name === 'Open' ? 'OPEN' : 
                                       data.name === 'Under Review' ? 'UNDER_REVIEW' : 
                                       'CLOSED';
                          const params = new URLSearchParams({ status });
                          if (selectedDepartment !== 'all') {
                            params.append('department', selectedDepartment);
                          }
                          navigate(`/admin/tickets?${params.toString()}`);
                        }}
                        cursor="pointer"
                      >
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Department Status Distribution</CardTitle>
            <CardDescription>Complete ticket status breakdown by department</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {loading ? (
              <Skeleton className="h-[400px]" />
            ) : departmentStatusData.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No department data available</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentStatusData} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted)/20)' }}
                    />
                    <Bar dataKey="OPEN" stackId="a" name="Open">
                      {departmentStatusData.map((entry, index) => (
                        <Cell key={`open-${index}`} fill={`hsl(${200 + (index * 20)}, 70%, ${65 - (entry.total / Math.max(...departmentStatusData.map(d => d.total)) * 20)}%)`} />
                      ))}
                    </Bar>
                    <Bar dataKey="UNDER_REVIEW" stackId="a" name="Under Review">
                      {departmentStatusData.map((entry, index) => (
                        <Cell key={`review-${index}`} fill={`hsl(${200 + (index * 20)}, 60%, ${60 - (entry.total / Math.max(...departmentStatusData.map(d => d.total)) * 15)}%)`} />
                      ))}
                    </Bar>
                    <Bar dataKey="CLOSED" stackId="a" name="Closed" radius={[4, 4, 0, 0]}>
                      {departmentStatusData.map((entry, index) => (
                        <Cell key={`closed-${index}`} fill={`hsl(${200 + (index * 20)}, 50%, ${55 - (entry.total / Math.max(...departmentStatusData.map(d => d.total)) * 10)}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Recent Tickets</CardTitle>
            <CardDescription>View and filter tickets across all departments</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-background">
                  All ({stats?.totalTickets || 0})
                </TabsTrigger>
                <TabsTrigger value="open" className="data-[state=active]:bg-background">
                  Open ({stats?.openTickets || 0})
                </TabsTrigger>
                <TabsTrigger value="review" className="data-[state=active]:bg-background">
                  Under Review ({stats?.inProgressTickets || 0})
                </TabsTrigger>
                <TabsTrigger value="closed" className="data-[state=active]:bg-background">
                  Closed ({stats?.resolvedTickets || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No tickets found</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {activeTab === 'all' && 'No tickets in the system yet'}
                      {activeTab === 'open' && 'No open tickets at the moment'}
                      {activeTab === 'review' && 'No tickets are currently under review'}
                      {activeTab === 'closed' && 'No closed tickets to display'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold">Ticket #</TableHead>
                          <TableHead className="font-semibold">Title</TableHead>
                          <TableHead className="font-semibold">Student</TableHead>
                          <TableHead className="font-semibold">Department</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.slice(0, 10).map((ticket) => (
                          <TableRow 
                            key={ticket.id}
                            className="cursor-pointer transition-colors hover:bg-muted/50"
                            onClick={() => navigate(`/student/ticket/${ticket.id}`)}
                          >
                            <TableCell className="font-mono text-sm">{ticket.ticket_no}</TableCell>
                            <TableCell className="max-w-xs truncate font-medium">{ticket.title}</TableCell>
                            <TableCell className="text-muted-foreground">{ticket.student?.full_name || 'N/A'}</TableCell>
                            <TableCell className="text-muted-foreground">{ticket.department?.name || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                ticket.status === 'OPEN' ? 'destructive' :
                                ticket.status === 'UNDER_REVIEW' ? 'default' :
                                'secondary'
                              }>
                                {ticket.status === 'UNDER_REVIEW' ? 'Under Review' : ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(ticket.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
