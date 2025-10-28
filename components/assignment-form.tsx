'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const assignmentFormSchema = z.object({
  subject: z.string().min(2, { message: 'Mata pelajaran harus memiliki setidaknya 2 karakter.' }),
  learningGoal: z.string().min(5, { message: 'Tujuan pembelajaran harus memiliki setidaknya 5 karakter.' }),
  type: z.enum(['tugas', 'ujian_sumatif'], { 
    required_error: 'Silakan pilih jenis tugas/ujian.' 
  }),
  classIds: z.array(z.string()).min(1, { message: 'Silakan pilih setidaknya satu kelas.' }),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

type Class = {
  id: string;
  name: string;
  grade: number;
};

type ClassQuota = {
  class: Class;
  currentCount: number;
  remaining: number;
  quotaPercentage: number;
};

export function AssignmentForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [classQuotas, setClassQuotas] = useState<ClassQuota[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize the form
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      subject: '',
      learningGoal: '',
      type: 'tugas',
      classIds: [],
    },
  });

  // Load classes and quotas on component mount
  useEffect(() => {
    fetchClassesAndQuotas();
  }, []);

  const fetchClassesAndQuotas = async () => {
    try {
      const [classesRes, quotasRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/assignments?type=class-quotas'),
      ]);

      if (!classesRes.ok || !quotasRes.ok) {
        throw new Error('Gagal memuat data kelas atau kuota');
      }

      const [classesData, quotasData] = await Promise.all([
        classesRes.json(),
        quotasRes.json(),
      ]);

      setClasses(classesData);
      setClassQuotas(quotasData);
    } catch (error) {
      console.error('Error fetching classes or quotas:', error);
      toast.error('Gagal memuat data kelas atau kuota');
    }
  };

  const onSubmit = async (data: AssignmentFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat tugas');
      }

      toast.success('Tugas berhasil dibuat!');
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat tugas');
    } finally {
      setLoading(false);
    }
  };

  const toggleClassSelection = (classId: string) => {
    const currentClassIds = form.getValues('classIds');
    if (currentClassIds.includes(classId)) {
      form.setValue('classIds', currentClassIds.filter(id => id !== classId));
    } else {
      form.setValue('classIds', [...currentClassIds, classId]);
    }
  };

  // Function to get class quota for a given class
  const getClassQuota = (classId: string) => {
    return classQuotas.find(q => q.class.id === classId);
  };

  // Group classes by grade
  const classesByGrade = classes.reduce((acc, cls) => {
    if (!acc[cls.grade]) {
      acc[cls.grade] = [];
    }
    acc[cls.grade].push(cls);
    return acc;
  }, {} as Record<number, Class[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Tugas/Ujian</CardTitle>
        <CardDescription>
          Buat tugas atau ujian sumatif untuk kelas yang dipilih
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mata Pelajaran</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Matematika, Bahasa Indonesia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="learningGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tujuan Pembelajaran</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Jelaskan tujuan pembelajaran dari tugas/ujian ini" 
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis tugas/ujian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tugas">Tugas</SelectItem>
                      <SelectItem value="ujian_sumatif">Ujian Sumatif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classIds"
              render={() => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <FormDescription>
                    Pilih kelas untuk menetapkan tugas/ujian
                  </FormDescription>
                  <div className="space-y-4">
                    {Object.entries(classesByGrade).map(([grade, gradeClasses]) => (
                      <div key={grade} className="space-y-2">
                        <h3 className="text-sm font-medium">Kelas {grade}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {gradeClasses.map((cls) => {
                            const quota = getClassQuota(cls.id);
                            const isSelected = form.getValues('classIds').includes(cls.id);
                            
                            // Determine badge color based on quota
                            let badgeVariant: 'default' | 'secondary' | 'destructive' = 'default';
                            if (quota) {
                              if (quota.remaining === 0) {
                                badgeVariant = 'destructive';
                              } else if (quota.remaining === 1) {
                                badgeVariant = 'secondary';
                              }
                            }

                            return (
                              <div 
                                key={cls.id}
                                className={`flex items-center rounded border p-3 ${isSelected ? 'border-blue-500 bg-blue-50/30' : ''}`}
                              >
                                <Checkbox
                                  id={`class-${cls.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleClassSelection(cls.id)}
                                  className="mr-2"
                                />
                                <div className="flex-1">
                                  <label 
                                    htmlFor={`class-${cls.id}`} 
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {cls.name}
                                  </label>
                                  {quota && (
                                    <div className="text-xs text-muted-foreground">
                                      Sisa kuota: {quota.remaining}/2
                                    </div>
                                  )}
                                </div>
                                {quota && (
                                  <Badge variant={badgeVariant}>
                                    {quota.currentCount}/2
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Membuat...' : 'Buat Tugas/Ujian'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}