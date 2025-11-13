import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { generateTicketNumber } from '@/lib/ticketHelpers';
import { classifyTicket } from '@/lib/ml';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  body: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long')
});

export default function CreateTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [prediction, setPrediction] = useState<{ departmentId: string; departmentName: string; confidence: number } | null>(null);

  const handleClassify = async () => {
    const result = ticketSchema.safeParse({ title, body });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setClassifying(true);
    try {
      // Classify ticket using ML API
      const classificationResult = await classifyTicket({ title, body });
      
      // Find department by name from API response
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name, code');
      
      if (!departments) {
        throw new Error('Failed to fetch departments');
      }

      const dept = departments.find(d => 
        d.name.toLowerCase().includes(classificationResult.predicted_category.toLowerCase()) ||
        classificationResult.predicted_category.toLowerCase().includes(d.name.toLowerCase())
      );
      
      if (!dept) {
        throw new Error('Could not match to a department. Please try again.');
      }

      setPrediction({
        departmentId: dept.id,
        departmentName: dept.name,
        confidence: classificationResult.confidence
      });

      toast.success(`Will route to: ${dept.name}`);
    } catch (error: any) {
      console.error('Classification error:', error);
      toast.error(error.message || 'Classification failed. Please try again.');
      setPrediction(null);
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!prediction) {
      toast.error('Please classify the ticket first');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const ticketNo = await generateTicketNumber();
      
      // Create ticket with classified department
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          ticket_no: ticketNo,
          student_id: user.id,
          title,
          body,
          department_id: prediction.departmentId,
          predicted_category: prediction.departmentName,
          predicted_confidence: prediction.confidence,
          status: 'OPEN'
        })
        .select()
        .single();
      
      if (ticketError) throw ticketError;

      // Auto-assign to department admin
      const { data: deptAdmin } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'dept_admin')
        .eq('department_id', prediction.departmentId)
        .limit(1)
        .single();
      
      if (deptAdmin) {
        await supabase.from('ticket_assignments').insert({
          ticket_id: ticket.id,
          assignee_id: deptAdmin.id,
          assigned_by: user.id
        });
      }

      // Create status history
      await supabase.from('status_history').insert({
        ticket_id: ticket.id,
        from_status: null,
        to_status: 'OPEN',
        changed_by: user.id,
        note: `Ticket created and auto-routed to ${prediction.departmentName}`
      });

      toast.success(`Ticket ${ticket.ticket_no} created and routed to ${prediction.departmentName}!`);
      navigate(`/tickets/${ticket.id}`);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(error.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Create New Ticket</CardTitle>
            <CardDescription>
              Describe your issue and we'll route it to the right department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of your issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                placeholder="Provide detailed information about your grievance..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{body.length}/2000</p>
            </div>

            {!prediction ? (
              <Button 
                onClick={handleClassify}
                disabled={classifying || !title || !body}
                className="w-full"
                variant="outline"
              >
                {classifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Classify & Preview Department
                  </>
                )}
              </Button>
            ) : (
              <>
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-lg">Routing to: {prediction.departmentName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {(prediction.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => setPrediction(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Re-classify
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Submit Ticket'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
