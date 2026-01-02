import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, FileText, Pill, CreditCard, Loader2, Upload, X, Image as ImageIcon, MoreVertical, Pencil, Trash2, Calendar, PawPrint, StickyNote, Maximize2, Sparkles, AlertTriangle, Bell, Flag, RefreshCw, Download, Lock, FileDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { parseISO, format as formatGregorianDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatShortDate, formatDisplayDate } from '@/lib/dateUtils';
import { DatePicker } from '@/components/ui/date-picker';
import jsPDF from 'jspdf';
import { loadVazirmatnFont, registerVazirmatnFont, prepareRtlText } from '@/lib/pdfFonts';

interface Pet {
  id: string;
  name: string;
}

interface MedicalRecord {
  id: string;
  pet_id: string;
  category: string;
  image_path: string;
  title: string | null;
  notes: string | null;
  record_date: string | null;
  created_at: string;
  pet?: Pet;
  ai_analysis: string | null;
  ai_analyzed_at: string | null;
}

const HealthVault = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPaidUser, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, isRTL, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState({
    pet_id: '',
    category: 'medical_test',
    title: '',
    notes: '',
    record_date: formatGregorianDate(new Date(), 'yyyy-MM-dd'),
  });
  const [activeTab, setActiveTab] = useState('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [petFilter, setPetFilter] = useState<string>('all');
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [editForm, setEditForm] = useState({ title: '', notes: '', category: '', record_date: '' });
  const [saving, setSaving] = useState(false);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reminderSuggestion, setReminderSuggestion] = useState<{
    needed: boolean;
    type?: 'vaccine' | 'deworming' | 'checkup' | 'medication';
    title?: string;
    days_until_due?: number;
  } | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfPet, setSelectedPdfPet] = useState<string>('');
  
  // Date feedback state
  const [dateFeedbackOpen, setDateFeedbackOpen] = useState(false);
  const [dateFeedback, setDateFeedback] = useState({ correctDate: '', notes: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const categories = [
    { value: 'medical_test', labelKey: 'vault.medicalTest', icon: FileText, color: 'bg-primary/10 text-primary' },
    { value: 'prescription', labelKey: 'vault.prescription', icon: Pill, color: 'bg-secondary/10 text-secondary' },
    { value: 'passport', labelKey: 'vault.passport', icon: CreditCard, color: 'bg-accent/10 text-accent-foreground' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchRecords();
    }
  }, [user]);

  const fetchPets = async () => {
    const { data } = await supabase.from('pets').select('id, name');
    if (data) setPets(data);
  };

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, pets(id, name)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const mappedRecords = data.map(r => ({
        ...r,
        pet: r.pets as Pet | undefined,
      }));
      setRecords(mappedRecords);
      
      // Generate signed URLs for all images
      const urls: Record<string, string> = {};
      for (const record of mappedRecords) {
        const { data: signedData } = await supabase.storage
          .from('medical-records')
          .createSignedUrl(record.image_path, 3600); // 1 hour expiry
        if (signedData?.signedUrl) {
          urls[record.image_path] = signedData.signedUrl;
        }
      }
      setImageUrls(urls);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('common.error'), description: t('vault.fileTooLarge'), variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile || !newRecord.pet_id) return;

    setUploading(true);
    
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('medical_records').insert({
        pet_id: newRecord.pet_id,
        category: newRecord.category,
        image_path: fileName,
        title: newRecord.title || null,
        notes: newRecord.notes || null,
        record_date: newRecord.record_date,
      });

      if (insertError) throw insertError;

      toast({ title: t('vault.uploaded'), description: '' });
      setAddRecordOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewRecord({
        pet_id: '',
        category: 'medical_test',
        title: '',
        notes: '',
        record_date: formatGregorianDate(new Date(), 'yyyy-MM-dd'),
      });
      fetchRecords();
    } catch (error) {
      toast({ title: t('common.error'), description: t('vault.uploadError'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (path: string) => {
    return imageUrls[path] || '';
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;
    
    const recordToDelete = records.find(r => r.id === deleteRecordId);
    if (!recordToDelete) return;

    setDeleting(true);
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('medical-records')
        .remove([recordToDelete.image_path]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', deleteRecordId);

      if (dbError) throw dbError;

      toast({ title: t('vault.deleted') });
      setDeleteRecordId(null);
      fetchRecords();
    } catch (error) {
      toast({ title: t('common.error'), description: t('vault.deleteError'), variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
    setEditForm({
      title: record.title || '',
      notes: record.notes || '',
      category: record.category,
      record_date: record.record_date || formatGregorianDate(new Date(), 'yyyy-MM-dd'),
    });
    setEditSelectedFile(null);
    setEditPreviewUrl(null);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('common.error'), description: t('vault.fileTooLarge'), variant: 'destructive' });
        return;
      }
      setEditSelectedFile(file);
      setEditPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !user) return;

    setSaving(true);
    try {
      let newImagePath = editingRecord.image_path;

      // If a new file was selected, upload it
      if (editSelectedFile) {
        const fileExt = editSelectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('medical-records')
          .upload(fileName, editSelectedFile);

        if (uploadError) throw uploadError;

        // Delete old image
        await supabase.storage
          .from('medical-records')
          .remove([editingRecord.image_path]);

        newImagePath = fileName;
      }

      const { error } = await supabase
        .from('medical_records')
        .update({
          title: editForm.title.trim() || null,
          notes: editForm.notes.trim() || null,
          category: editForm.category,
          image_path: newImagePath,
          record_date: editForm.record_date,
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast({ title: t('vault.updated') });
      setEditingRecord(null);
      setEditSelectedFile(null);
      setEditPreviewUrl(null);
      fetchRecords();
    } catch (error) {
      toast({ title: t('common.error'), description: t('vault.updateError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAiAnalysis = async (record: MedicalRecord, forceRegenerate: boolean = false) => {
    // If we have a saved analysis and not forcing regenerate, use it
    if (record.ai_analysis && !forceRegenerate) {
      setAiAnalysis(record.ai_analysis);
      return;
    }

    setAnalyzing(true);
    // Clear the local aiAnalysis state to show loading
    if (forceRegenerate) {
      setAiAnalysis(null);
    }
    setReminderSuggestion(null);
    
    try {
      const pet = pets.find(p => p.id === record.pet_id);
      
      // Get the signed URL for the image
      const imageUrl = imageUrls[record.image_path];
      
      const { data, error } = await supabase.functions.invoke('analyze-medical-record', {
        body: {
          record_title: record.title,
          record_category: record.category,
          record_notes: record.notes,
          pet_name: pet?.name,
          language: language,
          image_url: imageUrl,
        },
      });

      if (error) throw error;
      
      const analysisText = data.analysis;
      
      if (data.reminderSuggestion) {
        setReminderSuggestion(data.reminderSuggestion);
      }

      const analyzedAt = new Date().toISOString();

      // Save the analysis to the database
      await supabase
        .from('medical_records')
        .update({
          ai_analysis: analysisText,
          ai_analyzed_at: analyzedAt,
        })
        .eq('id', record.id);

      // Update local aiAnalysis state - this is what's displayed
      setAiAnalysis(analysisText);

      // Update records list
      setRecords(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, ai_analysis: analysisText, ai_analyzed_at: analyzedAt }
          : r
      ));
      
      // Update viewingRecord using functional update to get latest state
      setViewingRecord(prev => 
        prev && prev.id === record.id 
          ? { ...prev, ai_analysis: analysisText, ai_analyzed_at: analyzedAt }
          : prev
      );
    } catch (error) {
      console.error('AI Analysis error:', error);
      toast({ 
        title: t('common.error'), 
        description: language === 'fa' ? 'خطا در تحلیل هوش مصنوعی' : 'AI analysis failed',
        variant: 'destructive' 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateReminderFromAI = () => {
    if (!reminderSuggestion || !viewingRecord) return;
    
    const pet = pets.find(p => p.id === viewingRecord.pet_id);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (reminderSuggestion.days_until_due || 0));
    
    // Get default title based on type
    const getDefaultTitle = () => {
      const type = reminderSuggestion.type;
      if (language === 'fa') {
        if (type === 'medication') return 'یادآوری تهیه دارو';
        if (type === 'deworming') return 'یادآوری ضدانگل';
        return 'یادآوری واکسن';
      } else {
        if (type === 'medication') return 'Medication Refill Reminder';
        if (type === 'deworming') return 'Deworming Reminder';
        return 'Vaccination Reminder';
      }
    };
    
    // Navigate to reminders page with pre-filled data
    navigate('/reminders', { 
      state: { 
        createReminder: true,
        petId: viewingRecord.pet_id,
        petName: pet?.name,
        title: reminderSuggestion.title || getDefaultTitle(),
        type: reminderSuggestion.type || 'vaccine',
        dueDate: formatGregorianDate(dueDate, 'yyyy-MM-dd'),
      } 
    });
  };
  
  const handleDateFeedback = async () => {
    if (!dateFeedback.correctDate.trim() && !dateFeedback.notes.trim()) return;
    
    setSubmittingFeedback(true);
    
    // Log feedback for improvement (in production, this could go to a feedback table)
    console.log('Date feedback submitted:', {
      record_id: viewingRecord?.id,
      record_category: viewingRecord?.category,
      ai_analysis: aiAnalysis,
      correct_date: dateFeedback.correctDate,
      user_notes: dateFeedback.notes,
      timestamp: new Date().toISOString()
    });
    
    // Show success toast
    toast({
      title: language === 'fa' ? 'بازخورد ارسال شد' : 'Feedback submitted',
      description: language === 'fa' ? 'از کمک شما ممنونیم!' : 'Thank you for helping us improve!',
    });
    
    setDateFeedbackOpen(false);
    setDateFeedback({ correctDate: '', notes: '' });
    setSubmittingFeedback(false);
  };

  // Open PDF dialog
  const handleOpenPdfDialog = () => {
    if (!isPaidUser) {
      toast({
        title: language === 'fa' ? 'نیاز به اشتراک' : 'Subscription Required',
        description: language === 'fa' 
          ? 'برای دانلود گزارش دامپزشکی، باید اشتراک داشته باشید.' 
          : 'You need a subscription to download the vet report.',
        variant: 'destructive',
      });
      navigate('/subscription');
      return;
    }

    // If only one pet, select it automatically
    if (pets.length === 1) {
      setSelectedPdfPet(pets[0].id);
    } else {
      setSelectedPdfPet('');
    }
    setPdfDialogOpen(true);
  };

  // Load image as base64 for PDF
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // Generate PDF for selected pet
  const handleDownloadPdf = async () => {
    if (!selectedPdfPet) {
      toast({
        title: language === 'fa' ? 'لطفاً حیوان را انتخاب کنید' : 'Please select a pet',
        variant: 'destructive',
      });
      return;
    }

    const selectedPet = pets.find(p => p.id === selectedPdfPet);
    const petRecords = records
      .filter(r => r.pet_id === selectedPdfPet)
      .sort((a, b) => {
        const dateA = a.record_date ? new Date(a.record_date).getTime() : 0;
        const dateB = b.record_date ? new Date(b.record_date).getTime() : 0;
        return dateB - dateA; // Most recent first
      });

    if (petRecords.length === 0) {
      toast({
        title: language === 'fa' ? 'پرونده‌ای یافت نشد' : 'No Records Found',
        description: language === 'fa' 
          ? 'هیچ پرونده پزشکی برای این حیوان وجود ندارد.' 
          : 'No medical records available for this pet.',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingPdf(true);
    setPdfDialogOpen(false);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = 20;

      // Load and register Persian font for Farsi text
      const isFarsi = language === 'fa';
      if (isFarsi) {
        try {
          const fontBase64 = await loadVazirmatnFont();
          registerVazirmatnFont(doc, fontBase64);
          doc.setFont('Vazirmatn');
        } catch (fontError) {
          console.error('Failed to load Persian font:', fontError);
          toast({
            title: 'خطا در بارگذاری فونت',
            description: 'PDF با فونت پیش‌فرض ایجاد می‌شود',
            variant: 'destructive',
          });
        }
      }

      // Helper function to handle RTL text
      const addText = (text: string, x: number, y: number, options?: any) => {
        const processedText = isFarsi ? prepareRtlText(text) : text;
        doc.text(processedText, x, y, options);
      };

      // Header with pet name
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129);
      const title = isFarsi 
        ? `${selectedPet?.name} پزشکی گزارش`
        : `Medical Report - ${selectedPet?.name}`;
      addText(title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Subtitle
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      const subtitle = isFarsi 
        ? 'دامپزشک به ارائه برای بهداشتی پرونده کامل گزارش'
        : 'Complete Health Records Report for Veterinary Use';
      addText(subtitle, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Generation date
      doc.setFontSize(9);
      const dateStr = isFarsi 
        ? `${formatDisplayDate(formatGregorianDate(new Date(), 'yyyy-MM-dd'), language)} :تولید تاریخ`
        : `Generated: ${formatDisplayDate(formatGregorianDate(new Date(), 'yyyy-MM-dd'), language)}`;
      addText(dateStr, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary section
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52);
      const summaryTitle = isFarsi ? 'پرونده خلاصه' : 'Record Summary';
      addText(summaryTitle, isFarsi ? pageWidth - margin - 5 : margin + 5, yPos + 7, isFarsi ? { align: 'right' } : undefined);
      
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const recordCount = isFarsi ? `${petRecords.length} :ها پرونده تعداد` : `Total Records: ${petRecords.length}`;
      const analyzedCount = petRecords.filter(r => r.ai_analysis).length;
      const analysisInfo = isFarsi ? `${analyzedCount} :شده تحلیل` : `AI Analyzed: ${analyzedCount}`;
      addText(recordCount, isFarsi ? pageWidth - margin - 5 : margin + 5, yPos + 15, isFarsi ? { align: 'right' } : undefined);
      addText(analysisInfo, isFarsi ? pageWidth - margin - 5 : margin + 5, yPos + 21, isFarsi ? { align: 'right' } : undefined);
      
      // Date range
      const dates = petRecords.map(r => r.record_date).filter(Boolean).sort();
      if (dates.length > 0) {
        const dateRange = isFarsi
          ? `${formatDisplayDate(dates[dates.length - 1]!, language)} تا ${formatDisplayDate(dates[0]!, language)} :زمانی بازه`
          : `Date Range: ${formatDisplayDate(dates[0]!, language)} to ${formatDisplayDate(dates[dates.length - 1]!, language)}`;
        addText(dateRange, pageWidth / 2, yPos + 15, { align: 'center' });
      }
      
      yPos += 35;

      // Timeline header
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      const timelineTitle = isFarsi ? 'ها پرونده لاین تایم' : 'Records Timeline';
      addText(timelineTitle, isFarsi ? pageWidth - margin : margin, yPos, isFarsi ? { align: 'right' } : undefined);
      yPos += 10;

      // Process each record with timeline
      for (let i = 0; i < petRecords.length; i++) {
        const record = petRecords[i];
        
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }

        // Timeline dot and line
        doc.setFillColor(16, 185, 129);
        doc.circle(margin + 3, yPos + 3, 3, 'F');
        if (i < petRecords.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(margin + 3, yPos + 8, margin + 3, yPos + 80);
        }

        // Date badge
        const recordDate = record.record_date 
          ? formatDisplayDate(record.record_date, language)
          : (isFarsi ? 'تاریخ بدون' : 'No date');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        addText(recordDate, isFarsi ? pageWidth - margin - 12 : margin + 12, yPos + 2, isFarsi ? { align: 'right' } : undefined);

        // Record title
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const recordTitle = record.title || (isFarsi ? 'عنوان بدون' : 'Untitled');
        addText(recordTitle, isFarsi ? pageWidth - margin - 12 : margin + 12, yPos + 9, isFarsi ? { align: 'right' } : undefined);

        // Category badge
        const categoryLabel = categories.find(c => c.value === record.category)?.labelKey;
        const categoryText = categoryLabel ? t(categoryLabel) : record.category;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        if (isFarsi) {
          addText(`[${categoryText}]`, pageWidth - margin - 12 - doc.getTextWidth(recordTitle) - 3, yPos + 9);
        } else {
          doc.text(`[${categoryText}]`, margin + 12 + doc.getTextWidth(recordTitle) + 3, yPos + 9);
        }

        yPos += 15;

        // Try to add image
        const imageUrl = imageUrls[record.image_path];
        if (imageUrl) {
          try {
            const base64Image = await loadImageAsBase64(imageUrl);
            if (base64Image) {
              // Check if we need a new page for the image
              if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
              }
              
              const imgWidth = 50;
              const imgHeight = 35;
              doc.addImage(base64Image, 'JPEG', margin + 12, yPos, imgWidth, imgHeight);
              
              // Add notes next to image if exists
              if (record.notes) {
                doc.setFontSize(8);
                doc.setTextColor(80, 80, 80);
                const notesLabel = isFarsi ? ':یادداشت' : 'Notes:';
                addText(notesLabel, margin + 12 + imgWidth + 5, yPos + 5);
                const splitNotes = doc.splitTextToSize(record.notes, pageWidth - margin * 2 - imgWidth - 25);
                // For RTL, we don't reverse multiline notes as each line should be in order
                doc.text(splitNotes.slice(0, 4), margin + 12 + imgWidth + 5, yPos + 11);
              }
              
              yPos += imgHeight + 5;
            }
          } catch (e) {
            console.log('Could not load image for PDF');
          }
        }

        // AI Analysis section
        if (record.ai_analysis) {
          if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
          }

          // AI analysis box
          doc.setFillColor(249, 250, 251);
          doc.setDrawColor(16, 185, 129);
          doc.setLineWidth(0.3);
          
          const analysisLines = doc.splitTextToSize(record.ai_analysis, pageWidth - margin * 2 - 30);
          const displayLines = analysisLines.slice(0, 8);
          const boxHeight = Math.min(displayLines.length * 4 + 12, 50);
          
          doc.roundedRect(margin + 12, yPos, pageWidth - margin * 2 - 12, boxHeight, 2, 2, 'FD');
          
          doc.setFontSize(9);
          doc.setTextColor(16, 185, 129);
          const aiLabel = isFarsi ? 'مصنوعی هوش تحلیل' : 'AI Analysis';
          addText(aiLabel, isFarsi ? pageWidth - margin - 15 : margin + 15, yPos + 7, isFarsi ? { align: 'right' } : undefined);
          
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);
          doc.text(displayLines, margin + 15, yPos + 14);
          
          if (analysisLines.length > 8) {
            doc.setTextColor(150, 150, 150);
            doc.text('...', margin + 15, yPos + boxHeight - 3);
          }
          
          yPos += boxHeight + 10;
        } else {
          yPos += 10;
        }

        yPos += 5;
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const footer = isFarsi 
        ? 'petcare.app | است شده تولید PetCare اپلیکیشن توسط گزارش این'
        : 'Generated by PetCare App | petcare.app';
      addText(footer, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Add page numbers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (isFarsi) doc.setFont('Vazirmatn');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const pageText = isFarsi ? `${totalPages} از ${i} صفحه` : `Page ${i} of ${totalPages}`;
        addText(pageText, pageWidth - margin, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `${selectedPet?.name || 'pet'}-medical-report-${formatGregorianDate(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);

      toast({
        title: language === 'fa' ? 'گزارش آماده شد!' : 'Report Ready!',
        description: language === 'fa' 
          ? `گزارش پزشکی ${selectedPet?.name} دانلود شد.` 
          : `Medical report for ${selectedPet?.name} downloaded.`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: language === 'fa' ? 'خطا' : 'Error',
        description: language === 'fa' 
          ? 'خطا در تولید گزارش' 
          : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesCategory = activeTab === 'all' || r.category === activeTab;
    const matchesPet = petFilter === 'all' || r.pet_id === petFilter;
    return matchesCategory && matchesPet;
  });

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('vault.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('vault.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Download Vet Report Button - Hidden for now */}
              {/* <Button
                variant={isPaidUser ? "outline" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2 shrink-0",
                  !isPaidUser && "opacity-60",
                  isPaidUser && "border-primary/30 hover:border-primary hover:bg-primary/5"
                )}
                onClick={handleOpenPdfDialog}
                disabled={generatingPdf || subscriptionLoading}
              >
                {generatingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPaidUser ? (
                  <FileDown className="w-4 h-4 text-primary" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {language === 'fa' ? 'گزارش دامپزشکی' : 'Vet Report'}
                </span>
              </Button> */}
              
              {/* Add Record Button */}
              <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="fab" className="h-10 w-10 shrink-0">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('vault.uploadNew')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>{t('vault.image')}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {previewUrl ? (
                    <div className="relative">
                      <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        className="absolute top-2 end-2"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t('vault.upload')}</span>
                    </button>
                  )}
                </div>

                {/* Pet Selection */}
                <div className="space-y-2">
                  <Label>{t('reminder.selectPet')} *</Label>
                  <Select
                    value={newRecord.pet_id}
                    onValueChange={(value) => setNewRecord({ ...newRecord, pet_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('reminder.choosePet')} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>{t('vault.category')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setNewRecord({ ...newRecord, category: cat.value })}
                          className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs",
                            newRecord.category === cat.value
                              ? "border-primary bg-primary-soft"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-center leading-tight">{t(cat.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="record-title">{t('vault.recordTitle')}</Label>
                  <Input
                    id="record-title"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    placeholder={t('vault.titlePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>{t('vault.recordDate')}</Label>
                  <DatePicker
                    date={newRecord.record_date ? parseISO(newRecord.record_date) : undefined}
                    onDateChange={(date) => setNewRecord({ ...newRecord, record_date: date ? formatGregorianDate(date, 'yyyy-MM-dd') : '' })}
                    placeholder={t('common.selectDate')}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!selectedFile || !newRecord.pet_id || uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Upload className="w-4 h-4 me-2" />}
                  {uploading ? t('vault.uploading') : t('vault.upload')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </div>

        {/* Pet Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('reminder.selectPet')}:</span>
          <Select value={petFilter} onValueChange={setPetFilter}>
            <SelectTrigger className="w-[160px] bg-background h-9">
              <SelectValue placeholder={t('vault.allPets')} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">{t('vault.allPets')}</SelectItem>
              {pets.map(pet => (
                <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={cn("w-full grid grid-cols-4 bg-muted/50", isRTL && "direction-rtl")}>
            <TabsTrigger value="all" className="text-xs">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="medical_test" className="text-xs">{t('vault.medicalTests')}</TabsTrigger>
            <TabsTrigger value="prescription" className="text-xs">{t('vault.prescriptions')}</TabsTrigger>
            <TabsTrigger value="passport" className="text-xs">{t('vault.passports')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredRecords.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">{t('vault.noRecords')}</h3>
                  <p className="text-muted-foreground text-sm text-center mb-4">
                    {t('vault.startUploading')}
                  </p>
                  <Button onClick={() => setAddRecordOpen(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('vault.upload')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={cn("grid grid-cols-2 gap-3", isRTL && "direction-rtl")}>
                {filteredRecords.map((record, index) => {
                  const category = categories.find(c => c.value === record.category);
                  const Icon = category?.icon || FileText;
                  
                  return (
                    <Card 
                      key={record.id} 
                      className="card-elevated overflow-hidden animate-slide-up group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div 
                        className="aspect-[4/3] bg-muted relative cursor-pointer"
                        onClick={() => setViewingRecord(record)}
                      >
                        <img 
                          src={getImageUrl(record.image_path)} 
                          alt={record.title || 'Medical record'}
                          className="w-full h-full object-cover"
                        />
                        <div className={cn(
                          "absolute top-2 start-2 p-1.5 rounded-lg",
                          category?.color
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 end-2 h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full shadow-lg backdrop-blur-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background z-50 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRecord(record);
                              }} 
                              className="cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 me-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRecordId(record.id);
                              }}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 me-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardContent className={cn("p-3", isRTL ? "text-right" : "text-left")}>
                        <p className="font-medium text-sm truncate">
                          {record.title || (category ? t(category.labelKey) : '')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.pet?.name} • {record.record_date && formatShortDate(record.record_date, language)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Record Detail View Modal */}
        <Dialog open={!!viewingRecord} onOpenChange={() => { setViewingRecord(null); setAiAnalysis(null); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
            {viewingRecord && (() => {
              const category = categories.find(c => c.value === viewingRecord.category);
              const CategoryIcon = category?.icon || FileText;
              return (
                <>
                  {/* Image with full-screen option */}
                  <div className="relative aspect-[4/3] bg-muted">
                    <img 
                      src={getImageUrl(viewingRecord.image_path)} 
                      alt={viewingRecord.title || 'Medical record'}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 end-3 bg-black/50 hover:bg-black/70 text-white rounded-full h-9 w-9"
                      onClick={() => setSelectedImage(getImageUrl(viewingRecord.image_path))}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                    <div className={cn(
                      "absolute bottom-3 start-3 px-3 py-1.5 rounded-full flex items-center gap-2",
                      category?.color,
                      "bg-opacity-90 backdrop-blur-sm"
                    )}>
                      <CategoryIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{category ? t(category.labelKey) : ''}</span>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="p-4 space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {viewingRecord.title || (category ? t(category.labelKey) : t('vault.untitledRecord'))}
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {/* Pet */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <PawPrint className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">{t('vault.pet')}</p>
                          <p className="font-medium">{viewingRecord.pet?.name}</p>
                        </div>
                      </div>

                      {/* Date */}
                      {viewingRecord.record_date && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-secondary" />
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('vault.recordDate')}</p>
                            <p className="font-medium">{formatDisplayDate(viewingRecord.record_date, language)}</p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {viewingRecord.notes && (
                        <div className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <StickyNote className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{t('vault.notes')}</p>
                            <p className="font-medium whitespace-pre-wrap">{viewingRecord.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Analysis Section */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      {!aiAnalysis && !viewingRecord.ai_analysis && (
                        <Button 
                          variant="secondary" 
                          className="w-full"
                          onClick={() => handleAiAnalysis(viewingRecord)}
                          disabled={analyzing}
                        >
                          {analyzing ? (
                            <Loader2 className="w-4 h-4 me-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 me-2" />
                          )}
                          {analyzing ? t('vault.aiAnalyzing') : t('vault.aiAnalyze')}
                        </Button>
                      )}
                      
                      {(aiAnalysis || viewingRecord.ai_analysis) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Sparkles className="w-4 h-4 text-primary" />
                              {t('vault.aiAnalysisTitle')}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAiAnalysis(viewingRecord, true)}
                              disabled={analyzing}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {analyzing ? (
                                <Loader2 className="w-3 h-3 me-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3 me-1" />
                              )}
                              {language === 'fa' ? 'تحلیل مجدد' : 'Regenerate'}
                            </Button>
                          </div>
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm whitespace-pre-wrap">{aiAnalysis || viewingRecord.ai_analysis}</p>
                          </div>
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              {t('vault.aiDisclaimer')}
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {/* Reminder Suggestion */}
                            {reminderSuggestion?.needed && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleCreateReminderFromAI}
                                className="flex-1 justify-center bg-primary/5 border-primary/30 hover:bg-primary/10"
                              >
                                <Bell className="w-4 h-4 me-2 text-primary" />
                                {language === 'fa' ? 'ایجاد یادآوری' : 'Create Reminder'}
                              </Button>
                            )}
                            
                            {/* Report Wrong Date */}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDateFeedbackOpen(true)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Flag className="w-4 h-4 me-1" />
                              {language === 'fa' ? 'تاریخ اشتباه؟' : 'Wrong date?'}
                            </Button>
                          </div>
                          
                          {/* Date Feedback Dialog */}
                          <Dialog open={dateFeedbackOpen} onOpenChange={setDateFeedbackOpen}>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>
                                  {language === 'fa' ? 'گزارش تاریخ اشتباه' : 'Report Wrong Date'}
                                </DialogTitle>
                                <DialogDescription>
                                  {language === 'fa' 
                                    ? 'تاریخ صحیح را وارد کنید تا تحلیل هوش مصنوعی را بهبود دهیم.'
                                    : 'Enter the correct date to help us improve AI analysis.'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>
                                    {language === 'fa' ? 'تاریخ صحیح' : 'Correct Date'}
                                  </Label>
                                  <Input
                                    value={dateFeedback.correctDate}
                                    onChange={(e) => setDateFeedback({ ...dateFeedback, correctDate: e.target.value })}
                                    placeholder={language === 'fa' ? 'مثال: ۱۴۰۳/۱۰/۱۵' : 'e.g., 2024-12-25'}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>
                                    {language === 'fa' ? 'توضیحات (اختیاری)' : 'Notes (optional)'}
                                  </Label>
                                  <Textarea
                                    value={dateFeedback.notes}
                                    onChange={(e) => setDateFeedback({ ...dateFeedback, notes: e.target.value })}
                                    placeholder={language === 'fa' ? 'چه چیزی اشتباه خوانده شد؟' : 'What was read incorrectly?'}
                                    rows={3}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <Button 
                                  onClick={handleDateFeedback} 
                                  className="w-full"
                                  disabled={submittingFeedback || (!dateFeedback.correctDate.trim() && !dateFeedback.notes.trim())}
                                >
                                  {submittingFeedback ? (
                                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                  ) : null}
                                  {language === 'fa' ? 'ارسال بازخورد' : 'Submit Feedback'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          handleEditRecord(viewingRecord);
                          setViewingRecord(null);
                          setAiAnalysis(null);
                        }}
                      >
                        <Pencil className="w-4 h-4 me-2" />
                        {t('common.edit')}
                      </Button>
                      <Button 
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setDeleteRecordId(viewingRecord.id);
                          setViewingRecord(null);
                          setAiAnalysis(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 me-2" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Full Image Preview Modal */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('vault.viewFullImage')}</DialogTitle>
            </DialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 end-4 z-50 bg-white/20 hover:bg-white/30 text-white rounded-full h-12 w-12"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-7 h-7" />
            </Button>
            <div 
              className="flex items-center justify-center w-full h-full p-4 cursor-pointer"
              onClick={() => setSelectedImage(null)}
            >
              <img 
                src={selectedImage || ''} 
                alt="Medical record"
                className="max-w-full max-h-[85vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('vault.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('vault.deleteConfirmMessage')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteRecord}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Record Dialog */}
        <Dialog open={!!editingRecord} onOpenChange={() => {
          setEditingRecord(null);
          setEditSelectedFile(null);
          setEditPreviewUrl(null);
        }}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('vault.editRecord')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Image Change */}
              <div className="space-y-2">
                <Label>{t('vault.image')}</Label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditFileSelect}
                  className="hidden"
                />
                <div className="relative">
                  <img 
                    src={editPreviewUrl || (editingRecord ? getImageUrl(editingRecord.image_path) : '')} 
                    alt="Preview" 
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 end-2"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 me-2" />
                    {t('vault.changeImage')}
                  </Button>
                  {editPreviewUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute top-2 end-2"
                      onClick={() => {
                        setEditSelectedFile(null);
                        setEditPreviewUrl(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t('vault.category')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, category: cat.value })}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                          editForm.category === cat.value 
                            ? "border-primary bg-primary/5" 
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <CatIcon className="w-5 h-5" />
                        <span className="text-xs text-center leading-tight">{t(cat.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('vault.recordTitle')}</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder={t('vault.titlePlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>{t('vault.recordDate')}</Label>
                <DatePicker
                  date={editForm.record_date ? parseISO(editForm.record_date) : undefined}
                  onDateChange={(date) => setEditForm({ ...editForm, record_date: date ? formatGregorianDate(date, 'yyyy-MM-dd') : '' })}
                  placeholder={t('common.selectDate')}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t('vault.notes')}</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder={t('vault.notesPlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setEditingRecord(null);
                    setEditSelectedFile(null);
                    setEditPreviewUrl(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF Download Dialog */}
        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-primary" />
                {language === 'fa' ? 'دانلود گزارش دامپزشکی' : 'Download Vet Report'}
              </DialogTitle>
              <DialogDescription>
                {language === 'fa' 
                  ? 'گزارش کامل پرونده پزشکی با تصاویر و تحلیل هوش مصنوعی برای ارائه به دامپزشک'
                  : 'Complete medical report with images and AI analysis for your veterinarian'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Pet Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <PawPrint className="w-4 h-4" />
                  {language === 'fa' ? 'انتخاب حیوان خانگی' : 'Select Pet'}
                </Label>
                {pets.length === 1 ? (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-primary" />
                    <span className="font-medium">{pets[0].name}</span>
                  </div>
                ) : (
                  <Select value={selectedPdfPet} onValueChange={setSelectedPdfPet}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'fa' ? 'حیوان را انتخاب کنید...' : 'Choose a pet...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => {
                        const petRecordCount = records.filter(r => r.pet_id === pet.id).length;
                        return (
                          <SelectItem key={pet.id} value={pet.id}>
                            <div className="flex items-center gap-2">
                              <span>{pet.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({petRecordCount} {language === 'fa' ? 'پرونده' : 'records'})
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Report Info */}
              {selectedPdfPet && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {language === 'fa' ? 'محتوای گزارش' : 'Report Contents'}
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {language === 'fa' ? 'تایم‌لاین کامل پرونده‌ها' : 'Complete records timeline'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {language === 'fa' ? 'تصاویر مدارک پزشکی' : 'Medical document images'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {language === 'fa' ? 'تحلیل هوش مصنوعی' : 'AI analysis summaries'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {language === 'fa' ? 'یادداشت‌ها و جزئیات' : 'Notes and details'}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setPdfDialogOpen(false)}
              >
                {language === 'fa' ? 'انصراف' : 'Cancel'}
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handleDownloadPdf}
                disabled={!selectedPdfPet || generatingPdf}
              >
                {generatingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {language === 'fa' ? 'دانلود PDF' : 'Download PDF'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default HealthVault;
