import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, UserCheck, Shield } from 'lucide-react';
import nmimsLogo from '@/assets/nmims-logo.png';
export default function WelcomePage() {
  return <div className="min-h-screen bg-gradient-to-br from-background via-accent to-secondary">
      {/* Logo at top left */}
      <div className="absolute top-6 left-6 z-10">
        <img src={nmimsLogo} alt="NMIMS Logo" className="h-14" />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            NMIMS Grievance Redressal System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Submit and track your grievances efficiently. We're here to help resolve your concerns.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="animate-scale-in shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
              <CardDescription>
                Submit grievances, track tickets, and communicate with departments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/auth/student/sign-in" className="block">
                <Button className="w-full" size="lg">Sign In as Student</Button>
              </Link>
              <Link to="/auth/student/sign-up" className="block">
                <Button variant="outline" className="w-full" size="lg">Create Student Account</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="animate-scale-in shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <UserCheck className="w-10 h-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Teacher Portal</CardTitle>
              <CardDescription>
                Submit tickets and manage your own grievances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/auth/teacher/sign-in" className="block">
                <Button className="w-full" size="lg">Sign In as Teacher</Button>
              </Link>
              <Link to="/auth/teacher/sign-up" className="block">
                <Button variant="outline" className="w-full" size="lg">Create Teacher Account</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="animate-scale-in shadow-lg hover:shadow-xl transition-shadow border-primary/20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">Admin Portal</CardTitle>
              <CardDescription>
                Manage system settings, departments, and oversee all tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/auth/admin/sign-in" className="block">
                <Button className="w-full" size="lg" variant="default">
                  Main Admin Sign In
                </Button>
              </Link>
              <Link to="/auth/teacher/sign-in" className="block">
                <Button className="w-full" size="lg" variant="outline">
                  Dept Admin Sign In
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground pt-2">
                Admin accounts are created by Main Admin
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-card/50 backdrop-blur">
            
            
          </Card>
        </div>
      </div>
    </div>;
}