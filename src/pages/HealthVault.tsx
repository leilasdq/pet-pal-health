import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Pill, CreditCard, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

const categories = [
  { value: 'medical_test', label: 'Medical Tests', icon: FileText, color: 'bg-primary/10 text-primary' },
  { value: 'prescription', label: 'Prescriptions', icon: Pill, color: 'bg-secondary/10 text-secondary' },
  { value: 'passport', label: 'Pet Passport/ID', icon: CreditCard, color: 'bg-accent/10 text-accent-foreground' },
];

const HealthVault = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
    record_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [activeTab, setActiveTab] = useState('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: 'File size must be less than 10MB', variant: 'destructive' });
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

      toast({ title: 'Success', description: 'Record uploaded successfully!' });
      setAddRecordOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setNewRecord({
        pet_id: '',
        category: 'medical_test',
        title: '',
        notes: '',
        record_date: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchRecords();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload record', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('medical-records').getPublicUrl(path);
    return data.publicUrl;
  };

  const filteredRecords = activeTab === 'all' 
    ? records 
    : records.filter(r => r.category === activeTab);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Health Vault</h1>
            <p className="text-muted-foreground text-sm">Store medical records & documents</p>
          </div>
          <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="fab" className="h-12 w-12">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Medical Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label>Photo/Document</Label>
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
                        className="absolute top-2 right-2"
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
                      <span className="text-sm text-muted-foreground">Tap to upload</span>
                    </button>
                  )}
                </div>

                {/* Pet Selection */}
                <div className="space-y-2">
                  <Label>Select Pet *</Label>
                  <Select
                    value={newRecord.pet_id}
                    onValueChange={(value) => setNewRecord({ ...newRecord, pet_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a pet" />
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
                  <Label>Category</Label>
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
                          <span className="text-center leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="record-title">Title (optional)</Label>
                  <Input
                    id="record-title"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    placeholder="Blood test results"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="record-date">Date</Label>
                  <Input
                    id="record-date"
                    type="date"
                    value={newRecord.record_date}
                    onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!selectedFile || !newRecord.pet_id || uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 bg-muted/50">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="medical_test" className="text-xs">Tests</TabsTrigger>
            <TabsTrigger value="prescription" className="text-xs">Rx</TabsTrigger>
            <TabsTrigger value="passport" className="text-xs">ID</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredRecords.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No records yet</h3>
                  <p className="text-muted-foreground text-sm text-center mb-4">
                    Upload photos of medical documents to keep them organized
                  </p>
                  <Button onClick={() => setAddRecordOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Record
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredRecords.map((record, index) => {
                  const category = categories.find(c => c.value === record.category);
                  const Icon = category?.icon || FileText;
                  
                  return (
                    <Card 
                      key={record.id} 
                      className="card-elevated overflow-hidden cursor-pointer animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => setSelectedImage(getImageUrl(record.image_path))}
                    >
                      <div className="aspect-[4/3] bg-muted relative">
                        <img 
                          src={getImageUrl(record.image_path)} 
                          alt={record.title || 'Medical record'}
                          className="w-full h-full object-cover"
                        />
                        <div className={cn(
                          "absolute top-2 left-2 p-1.5 rounded-lg",
                          category?.color
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">
                          {record.title || category?.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.pet?.name} • {record.record_date && format(parseISO(record.record_date), 'MMM d, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Preview Modal */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <img 
              src={selectedImage || ''} 
              alt="Medical record"
              className="w-full h-auto"
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default HealthVault;
