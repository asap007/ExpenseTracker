import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Page() {
  return (
    <div className="h-[80vh] bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-center">Work in Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Under Construction</AlertTitle>
            <AlertDescription>
              This page is currently under development. Please check back later.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              We're working hard to bring you something amazing!
            </p>
            
            <div className="animate-pulse flex justify-center space-x-4">
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <div className="h-2 w-2 bg-primary rounded-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}