'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from '@/lib/auth-client';

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

type AssignmentStatus = 'pending' | 'graded' | 'overdue';

export function AssignmentList() {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all');
  const [gradingAssignment, setGradingAssignment] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [filter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments${filter !== 'all' ? `?status=${filter}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Gagal memuat daftar tugas');
      }
      
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Gagal memuat daftar tugas');
    } finally {
      setLoading(false);
    }
  };

  const updateGradeStatus = async (assignmentId: string, isGraded: boolean) => {
    try {
      setGradingAssignment(assignmentId);
      const response = await fetch('/api/assignments/grade', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId,
          isGraded
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memperbarui status penilaian');
      }

      toast.success(isGraded ? 'Penilaian telah dicatat' : 'Status penilaian telah diperbarui');
      
      // Update the local state to reflect the change
      setAssignments(prev => prev.map(assignment => {
        if (assignment.assignment.id === assignmentId) {
          return {
            ...assignment,
            status: {
              ...assignment.status,
              isGraded,
              gradedAt: isGraded ? new Date().toISOString() : null
            }
          };
        }
        return assignment;
      }));
    } catch (error) {
      console.error('Error updating grade status:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui status penilaian');
    } finally {
      setGradingAssignment(null);
    }
  };

  // Group assignments by assignment id to combine classes
  const groupedAssignments = assignments.reduce((acc, curr) => {
    const existing = acc.find(a => a.assignment.id === curr.assignment.id);
    if (existing) {
      existing.classes.push(curr.class);
    } else {
      acc.push({
        ...curr,
        classes: [curr.class]
      });
    }
    return acc;
  }, [] as (Assignment & { classes: Assignment['class'][] })[]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Daftar Tugas/Ujian</CardTitle>
          <CardDescription>
            Tugas dan ujian yang telah dibuat oleh Anda
          </CardDescription>
        </div>
        
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={(value: AssignmentStatus | 'all') => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Belum Dinilai</SelectItem>
              <SelectItem value="graded">Sudah Dinilai</SelectItem>
              <SelectItem value="overdue">Terlambat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Memuat data...</div>
        ) : groupedAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada tugas/ujian yang dibuat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tujuan Pembelajaran</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedAssignments.map((item) => (
                  <TableRow key={item.assignment.id}>
                    <TableCell className="font-medium">{item.assignment.subject}</TableCell>
                    <TableCell>
                      {item.classes.map(cls => `Kelas ${cls.grade} ${cls.name}`).join(', ')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.assignment.type === 'tugas' ? 'default' : 'secondary'}>
                        {item.assignment.type === 'tugas' ? 'Tugas' : 'Ujian Sumatif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.assignment.learningGoal}
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
                    <TableCell>
                      {!item.status.isGraded ? (
                        <Button
                          size="sm"
                          onClick={() => updateGradeStatus(item.assignment.id, true)}
                          disabled={gradingAssignment === item.assignment.id}
                        >
                          {gradingAssignment === item.assignment.id ? 'Memperbarui...' : 'Tandai Dinilai'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateGradeStatus(item.assignment.id, false)}
                          disabled={gradingAssignment === item.assignment.id}
                        >
                          {gradingAssignment === item.assignment.id ? 'Memperbarui...' : 'Ubah Status'}
                        </Button>
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
  );
}