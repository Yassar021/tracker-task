# **Documentation: Aplikasi Manajemen Tugas & Ujian - SMP YPS SINGKOLE**

## **🎯 Gambaran Umum**
Aplikasi full-stack untuk manajemen pemberian tugas dan ujian sumatif di SMP YPS SINGKOLE dengan sistem batas mingguan otomatis dan integrasi WhatsApp.

## **🏫 Struktur Kelas**
**18 Kelas (3 Tingkatan × 6 Karakter):**
- **Kelas 7:** DISCIPLINE, RESPECT, RESILIENT, COLLABORATIVE, CREATIVE, INDEPENDENT
- **Kelas 8:** DISCIPLINE, RESPECT, RESILIENT, COLLABORATIVE, CREATIVE, INDEPENDENT  
- **Kelas 9:** DISCIPLINE, RESPECT, RESILIENT, COLLABORATIVE, CREATIVE, INDEPENDENT

## **🚀 Fitur Utama**

### **Untuk Guru**
- ✅ Buat tugas/ujian dengan form terstandarisasi
- ✅ Validasi otomatis batas mingguan (maksimal 2 per kelas)
- ✅ Pilih multiple kelas dengan visual quota real-time
- ✅ Dashboard monitoring tugas yang dibuat
- ✅ Input nilai ke rapor sementara

### **Untuk Admin**
- ✅ Super dashboard semua aktivitas guru
- ✅ Pengaturan batas maksimal tugas & ujian
- ✅ WhatsApp integration untuk reminder penilaian
- ✅ Monitoring compliance dan statistik
- ✅ Audit trail semua perubahan sistem

## **🔄 Alur Sistem**

### **Siklus Mingguan**
- **Periode:** Senin - Minggu
- **Reset Otomatis:** Setiap hari Minggu
- **Batas Default:** 2 tugas/ujian per kelas per minggu

### **Workflow Guru**
1. Login → Dashboard guru
2. Form tugas: mapel, tujuan pembelajaran, jenis, pilih kelas
3. **Validasi real-time:** sistem cek kuota kelas
4. Submit → Tugas terdistribusi ke kelas
5. Input nilai setelah siswa mengumpulkan

### **Workflow Admin**  
1. Login → Admin dashboard
2. Monitoring semua tugas & status penilaian
3. Kirim reminder WA untuk tugas belum dinilai
4. Kelola pengaturan batas sistem
5. Generate laporan dan analytics

## **💾 Struktur Database**

### **Tabel Inti**
```sql
users (id, email, name, role, phone_number)
classes (id, grade, name, teacher_id)  
assignments (id, subject, learning_goal, type, week_number, status)
class_assignments (class_id, assignment_id, assigned_date)
assignment_status (assignment_id, is_graded, graded_at)
settings (key, value, description, updated_by)
reminder_logs (id, assignment_id, teacher_id, sent_at, message_sid)
```

## **🛠 Tech Stack**
- **Frontend:** Next.js 14 + TypeScript
- **UI Library:** shadcn/ui + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Drizzle ORM
- **External API:** Twilio WhatsApp API
- **Deployment:** Vercel (recommended)

## **⚙️ Fitur Teknis Khusus**

### **Validasi Batas Mingguan**
- Backend validation sebelum simpan tugas
- Frontend visual: hijau/kuning/merah berdasarkan kuota
- Error handling dengan pesan jelas

### **WhatsApp Integration**
- Template message dengan variable dinamis
- Log tracking pengiriman reminder
- Status delivery monitoring

### **Admin Control Panel**
- Dynamic settings yang bisa diubah runtime
- Audit log untuk semua perubahan setting
- Role-based access control

## **📱 Template Pesan WhatsApp**
```
Yth. Bapak/Ibu {nama_guru},

*REMINDER PENILAIAN TUGAS*
SMP YPS SINGKOLE

📚 *Tugas/Ujian*: {mata_pelajaran}
🎯 *Tujuan Pembelajaran*: {tujuan_pembelajaran}
👥 *Kelas*: {kelas_target}
📅 *Tanggal Dibuat*: {tanggal_buat}

Tugas ini sudah melewati batas pengumpulan dan belum dinilai.

Mohon segera melakukan penilaian dan menginput nilai ke dalam *Rapor Sementara*.

Terima kasih,
Admin SMP YPS SINGKOLE
```

## **🎨 UI/UX Features**
- Responsive design untuk mobile/desktop
- Real-time quota indicators
- Color-coded status system
- Tab navigation untuk tingkatan kelas
- Export functionality untuk laporan

## **🔐 Security & Validation**
- Role-based authentication
- Backend validation double layer
- SQL injection protection dengan Drizzle
- Audit logs untuk sensitive operations

## **📈 Future Enhancement Ideas**
- Mobile app untuk guru
- Integration dengan sistem rapor utama
- Auto-scheduling untuk ujian sumatif
- Predictive analytics untuk beban tugas
- Parent portal untuk monitoring siswa

---

**Status:** Ready for Development  
**Priority:** High - Academic Management System  
**Complexity:** Medium (Full-Stack with External API)