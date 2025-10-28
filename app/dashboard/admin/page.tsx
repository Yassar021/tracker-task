'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/lib/auth-client';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Assignment = {
  assignment: {
    id: string;
    subject: string;
    learningGoal: string;
    type: 'tugas' | 'ujian_sumatif';
    weekNumber: number;
    year: number;
    status: 'pending' | 'graded' | 'overdue';
    assignedDate: string;
    teacherId: string;
    createdAt: string;
    updatedAt: string;
  };
  classAssignment: {
    classId: string;
    assignmentId: string;
    assignedAt: string;
  };
  class: {
    id: string;
    name: string;
    grade: number;
    teacherId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  status: {
    assignmentId: string;
    isGraded: boolean;
    gradedAt: string | null;
    gradeInputBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
    role: 'teacher' | 'admin';
    phoneNumber: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type Setting = {
  key: string;
  value: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export default function AdminDashboard() {
  const { data: session, isLoading } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAssignmentValue, setMaxAssignmentValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated or if user is not admin
  useEffect(() => {
    if (!isLoading && (!session || session.user.role !== 'admin')) {
      redirect('/dashboard');
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (session?.user.role === 'admin') {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments
      const assignmentsRes = await fetch('/api/assignments');
      if (!assignmentsRes.ok) {
        throw new Error('Gagal memuat data tugas');
      }
      const assignmentsData = await assignmentsRes.json();
      
      // Fetch settings
      const settingsRes = await fetch('/api/settings');
      if (!settingsRes.ok) {
        throw new Error('Gagal memuat pengaturan');
      }
      const settingsData = await settingsRes.json();
      
      setAssignments(assignmentsData);
      setSettings(settingsData);
      
      // Find the max assignment setting to populate the input
      const maxAssignmentSetting = settingsData.find(
        (setting: Setting) => setting.key === 'max_assignments_per_class_per_week'
      );
      if (maxAssignmentSetting) {
        setMaxAssignmentValue(maxAssignmentSetting.value);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async () => {
    if (!maxAssignmentValue) {
      toast.error('Silakan masukkan nilai untuk batas maksimal tugas');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'max_assignments_per_class_per_week',
          value: maxAssignmentValue,
          description: 'Batas maksimal tugas per kelas per minggu'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memperbarui pengaturan');
      }

      toast.success('Pengaturan berhasil diperbarui');
      fetchDashboardData(); // Refresh the data
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui pengaturan');
    } finally {
      setSaving(false);
    }
  };

  // Group assignments by teacher to show teacher-wise stats
  const assignmentsByTeacher = assignments.reduce((acc, assignment) => {
    const teacherId = assignment.teacher.id;
    if (!acc[teacherId]) {
      acc[teacherId] = {
        teacher: assignment.teacher,
        assignments: []
      };
    }
    acc[teacherId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { teacher: Assignment['teacher'], assignments: Assignment[] }>);

  // Calculate statistics
  const totalAssignments = assignments.length;
  const pendingAssignments = assignments.filter(a => !a.status.isGraded).length;
  const gradedAssignments = assignments.filter(a => a.status.isGraded).length;

  if (isLoading) {
    return <div className="p-8 text-center">Memuat...</div>;
  }

  if (!session || session.user.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tugas</CardDescription>
              <CardTitle className="text-2xl">{totalAssignments}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Belum Dinilai</CardDescription>
              <CardTitle className="text-2xl">{pendingAssignments}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sudah Dinilai</CardDescription>
              <CardTitle className="text-2xl">{gradedAssignments}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="monitoring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Tugas Semua Guru</CardTitle>
                <CardDescription>Daftar semua tugas/ujian yang dibuat oleh guru</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Memuat data...</div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada tugas yang dibuat
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guru</TableHead>
                          <TableHead>Mata Pelajaran</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Tanggal Dibuat</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((item) => (
                          <TableRow key={item.assignment.id}>
                            <TableCell>{item.teacher.name}</TableCell>
                            <TableCell className="font-medium">{item.assignment.subject}</TableCell>
                            <TableCell>Kelas {item.class.grade} {item.class.name}</TableCell>
                            <TableCell>
                              <Badge variant={item.assignment.type === 'tugas' ? 'default' : 'secondary'}>
                                {item.assignment.type === 'tugas' ? 'Tugas' : 'Ujian Sumatif'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(item.assignment.assignedDate).toLocaleDateString('id-ID')}
                            </TableCell>
                            <TableCell>
                              {item.status.isGraded ? (
                                <Badge variant="secondary">Sudah Dinilai</Badge>
                              ) : (
                                <Badge variant="destructive">Belum Dinilai</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ringkasan per Guru</CardTitle>
                <CardDescription>Statistik tugas berdasarkan guru</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(assignmentsByTeacher).map((teacherData) => {
                    const pendingCount = teacherData.assignments.filter(a => !a.status.isGraded).length;
                    const gradedCount = teacherData.assignments.filter(a => a.status.isGraded).length;
                    
                    return (
                      <Card key={teacherData.teacher.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{teacherData.teacher.name}</CardTitle>
                          <CardDescription>{teacherData.teacher.email}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Tugas</p>
                              <p className="text-xl font-bold">{teacherData.assignments.length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Belum Dinilai</p>
                              <p className="text-xl font-bold text-red-500">{pendingCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Sudah Dinilai</p>
                              <p className="text-xl font-bold text-green-500">{gradedCount}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Sistem</CardTitle>
                <CardDescription>
                  Konfigurasi sistem manajemen tugas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-assignments">Batas Maksimal Tugas per Kelas per Minggu</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="max-assignments"
                      type="number"
                      min="1"
                      max="10"
                      value={maxAssignmentValue}
                      onChange={(e) => setMaxAssignmentValue(e.target.value)}
                      placeholder="Jumlah maksimal"
                    />
                    <Button onClick={updateSetting} disabled={saving}>
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Saat ini: {maxAssignmentValue || '2'} tugas per kelas per minggu
                  </p>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-2">Pengaturan Lainnya</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Fitur WhatsApp Reminder</span>
                      <span className="font-medium">Aktif</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sistem Audit Log</span>
                      <span className="font-medium">Aktif</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Validasi Kuota Mingguan</span>
                      <span className="font-medium">Aktif</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}