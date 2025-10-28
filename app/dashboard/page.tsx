'use client';

import { AssignmentForm } from '@/components/assignment-form';
import { AssignmentList } from '@/components/assignment-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { data: session, isLoading } = useSession();
  
  // Redirect based on user role
  useEffect(() => {
    if (!isLoading && session) {
      if (session.user.role === 'admin') {
        // Redirect admin to admin dashboard
        redirect('/dashboard/admin');
      }
      // Teacher continues to teacher dashboard
    }
  }, [session, isLoading]);

  if (isLoading) {
    return <div className="p-8 text-center">Memuat...</div>;
  }

  if (!session) {
    return null; // Will redirect to sign-in via middleware
  }

  // Only teachers reach this point
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssignmentForm />
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
              <CardDescription>
                Statistik tugas dan kelas Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold">Tugas Aktif</h3>
                  <p className="text-3xl font-bold mt-2">0</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold">Sudah Dinilai</h3>
                  <p className="text-3xl font-bold mt-2">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <AssignmentList />
      </div>
    </div>
  );
}