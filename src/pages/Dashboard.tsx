import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, PawPrint, Calendar, Bell, Syringe, Bug, Stethoscope, ChevronRight, Loader2, Dog, Cat, Pencil, Camera, ChevronDown, Trash2, Repeat, CheckCircle2, X, Sparkles, Heart, Eye } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format as formatGregorian, addWeeks, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatShortDate, calculateAge as calcAge, formatNumber } from '@/lib/dateUtils';
import { DatePicker } from '@/components/ui/date-picker';
import { SwipeableReminder } from '@/components/SwipeableReminder';
import { PetWeightChart } from '@/components/PetWeightChart';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type PetType = 'dog' | 'cat';
type Gender = 'male' | 'female';
type ActivityLevel = 'low' | 'moderate' | 'high';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  image_url: string | null;
  pet_type: PetType;
  gender?: Gender | null;
  is_neutered?: boolean;
  activity_level?: ActivityLevel | null;
  allergies?: string | null;
}

interface Reminder {
  id: string;
  pet_id: string;
  title: string;
  reminder_type: string;
  due_date: string;
  status: string;
  recurrence: string;
  recurrence_interval: number;
  pet?: Pet;
}

type RecurrenceUnit = 'none' | 'week' | 'month' | 'year';

const reminderTypeIcons: Record<string, typeof Syringe> = {
  vaccination: Syringe,
  antiparasitic: Bug,
  checkup: Stethoscope,
};

const reminderTypeColors: Record<string, string> = {
  vaccination: 'bg-primary/10 text-primary border-primary/20',
  antiparasitic: 'bg-warning/10 text-warning border-warning/20',
  checkup: 'bg-secondary/10 text-secondary border-secondary/20',
};

const petTypeIcons: Record<PetType, typeof Dog> = {
  dog: Dog,
  cat: Cat,
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, isRTL, language } = useLanguage();
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [editPetOpen, setEditPetOpen] = useState(false);
  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [newPet, setNewPet] = useState({ 
    name: '', 
    breed: '', 
    birth_date: '', 
    weight: '', 
    pet_type: 'dog' as PetType,
    gender: '' as '' | Gender,
    is_neutered: false,
    activity_level: '' as '' | ActivityLevel,
    allergies: ''
  });
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editPetData, setEditPetData] = useState({ 
    name: '', 
    breed: '', 
    birth_date: '', 
    weight: '', 
    pet_type: 'dog' as PetType,
    gender: '' as '' | Gender,
    is_neutered: false,
    activity_level: '' as '' | ActivityLevel,
    allergies: ''
  });
  const [newReminder, setNewReminder] = useState({ title: '', type: 'vaccination', due_date: '', recurrence: 'none' as RecurrenceUnit, recurrence_interval: 1 });
  const [addingPet, setAddingPet] = useState(false);
  const [editingPetLoading, setEditingPetLoading] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);
  const [editReminderOpen, setEditReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editReminderData, setEditReminderData] = useState({ title: '', type: 'vaccination', due_date: '', recurrence: 'none' as RecurrenceUnit, recurrence_interval: 1 });
  const [savingReminder, setSavingReminder] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [addedPetName, setAddedPetName] = useState('');
  const [healthTip, setHealthTip] = useState('');
  const [loadingTip, setLoadingTip] = useState(false);
  const [viewingPet, setViewingPet] = useState<Pet | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const showAllReminders = searchParams.get('showAllReminders') === 'true';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchReminders();
    }
  }, [user]);

  const fetchPets = async () => {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: t('common.error'), description: t('pet.addError'), variant: 'destructive' });
    } else {
      setPets((data || []).map(pet => ({
        ...pet,
        pet_type: (pet.pet_type || 'dog') as PetType,
        gender: pet.gender as Gender | null,
        activity_level: pet.activity_level as ActivityLevel | null,
      })));
    }
    setLoading(false);
  };

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*, pets(*)')
      .order('due_date', { ascending: true });
    
    if (!error && data) {
      const mappedReminders = data.map(r => ({
        ...r,
        pet: r.pets as Pet | undefined,
      }));
      setReminders(mappedReminders);
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setAddingPet(true);
    const petData = {
      user_id: user.id,
      name: newPet.name,
      breed: newPet.breed || null,
      birth_date: newPet.birth_date || null,
      weight: newPet.weight ? parseFloat(newPet.weight) : null,
      pet_type: newPet.pet_type,
      gender: newPet.gender || null,
      is_neutered: newPet.is_neutered,
      activity_level: newPet.activity_level || null,
      allergies: newPet.allergies || null,
    };

    const { data: insertedPet, error } = await supabase.from('pets').insert(petData).select('id').single();

    if (error) {
      toast({ title: t('common.error'), description: t('pet.addError'), variant: 'destructive' });
      setAddingPet(false);
    } else {
      // Add initial weight to weight history if weight was provided
      if (petData.weight && insertedPet?.id) {
        await supabase.from('weight_history').insert({
          pet_id: insertedPet.id,
          weight: Number(petData.weight.toFixed(3)),
          recorded_at: new Date().toISOString().split('T')[0],
        });
      }
      // Store pet name for success card
      setAddedPetName(newPet.name);
      
      // Close form dialog
      setAddPetOpen(false);
      
      // Fetch the AI health tip
      setLoadingTip(true);
      setShowSuccessCard(true);
      
      try {
        const response = await supabase.functions.invoke('pet-health-tip', {
          body: { pet: petData }
        });
        
        if (response.data?.tip) {
          setHealthTip(response.data.tip);
        } else {
          setHealthTip('از سلامت دوست کوچولوی خود مراقبت کنید! 🐾💚');
        }
      } catch (tipError) {
        console.error('Error fetching health tip:', tipError);
        setHealthTip('از سلامت دوست کوچولوی خود مراقبت کنید! 🐾💚');
      }
      
      setLoadingTip(false);
      
      // Reset form
      setNewPet({ 
        name: '', 
        breed: '', 
        birth_date: '', 
        weight: '', 
        pet_type: 'dog',
        gender: '',
        is_neutered: false,
        activity_level: '',
        allergies: ''
      });
      fetchPets();
    }
    setAddingPet(false);
  };

  const handleCloseSuccessCard = () => {
    setShowSuccessCard(false);
    setAddedPetName('');
    setHealthTip('');
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setEditPetData({
      name: pet.name,
      breed: pet.breed || '',
      birth_date: pet.birth_date || '',
      weight: pet.weight?.toString() || '',
      pet_type: pet.pet_type || 'dog',
      gender: pet.gender || '',
      is_neutered: pet.is_neutered || false,
      activity_level: pet.activity_level || '',
      allergies: pet.allergies || '',
    });
    setEditPetOpen(true);
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    setEditingPetLoading(true);
    const newWeight = editPetData.weight ? parseFloat(editPetData.weight) : null;
    const oldWeight = editingPet.weight;
    
    const { error } = await supabase.from('pets').update({
      name: editPetData.name,
      breed: editPetData.breed || null,
      birth_date: editPetData.birth_date || null,
      weight: newWeight,
      pet_type: editPetData.pet_type,
      gender: editPetData.gender || null,
      is_neutered: editPetData.is_neutered,
      activity_level: editPetData.activity_level || null,
      allergies: editPetData.allergies || null,
    }).eq('id', editingPet.id);

    if (error) {
      toast({ title: t('common.error'), description: t('pet.updateError'), variant: 'destructive' });
    } else {
      // Add weight history entry if weight changed
      if (newWeight !== null && newWeight !== oldWeight) {
        await supabase.from('weight_history').insert({
          pet_id: editingPet.id,
          weight: Number(newWeight.toFixed(3)),
          recorded_at: new Date().toISOString().split('T')[0],
        });
      }
      
      toast({ title: t('pet.updated'), description: '' });
      setEditPetOpen(false);
      setEditingPet(null);
      fetchPets();
    }
    setEditingPetLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPet) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t('common.error'), description: t('vault.fileTooLarge'), variant: 'destructive' });
      return;
    }

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${editingPet.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('pet-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: t('common.error'), description: t('pet.imageUploadError'), variant: 'destructive' });
      setUploadingImage(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pet-images')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase.from('pets').update({
      image_url: publicUrl,
    }).eq('id', editingPet.id);

    if (updateError) {
      toast({ title: t('common.error'), description: t('pet.updateError'), variant: 'destructive' });
    } else {
      setEditingPet({ ...editingPet, image_url: publicUrl });
      fetchPets();
    }
    setUploadingImage(false);
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId) return;

    setAddingReminder(true);
    const { error } = await supabase.from('reminders').insert({
      pet_id: selectedPetId,
      title: newReminder.title,
      reminder_type: newReminder.type,
      due_date: newReminder.due_date,
      recurrence: newReminder.recurrence,
      recurrence_interval: newReminder.recurrence_interval,
    });

    if (error) {
      toast({ title: t('common.error'), description: t('reminder.addError'), variant: 'destructive' });
    } else {
      toast({ title: t('reminder.added'), description: '' });
      setNewReminder({ title: '', type: 'vaccination', due_date: '', recurrence: 'none', recurrence_interval: 1 });
      setAddReminderOpen(false);
      fetchReminders();
    }
    setAddingReminder(false);
  };

  const handleToggleReminderStatus = async (reminder: Reminder) => {
    const newStatus = reminder.status === 'pending' ? 'completed' : 'pending';
    
    const { error } = await supabase
      .from('reminders')
      .update({ status: newStatus })
      .eq('id', reminder.id);

    if (error) {
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
      return;
    }

    // If completing a recurring reminder, create the next occurrence
    if (newStatus === 'completed' && reminder.recurrence && reminder.recurrence !== 'none') {
      const currentDueDate = parseISO(reminder.due_date);
      const interval = reminder.recurrence_interval || 1;
      let nextDueDate: Date;

      switch (reminder.recurrence) {
        case 'week':
          nextDueDate = addWeeks(currentDueDate, interval);
          break;
        case 'month':
          nextDueDate = addMonths(currentDueDate, interval);
          break;
        case 'year':
          nextDueDate = addYears(currentDueDate, interval);
          break;
        default:
          nextDueDate = currentDueDate;
      }

      await supabase.from('reminders').insert({
        pet_id: reminder.pet_id,
        title: reminder.title,
        reminder_type: reminder.reminder_type,
        due_date: formatGregorian(nextDueDate, 'yyyy-MM-dd'),
        recurrence: reminder.recurrence,
        recurrence_interval: reminder.recurrence_interval,
      });
    }

    toast({ 
      title: newStatus === 'completed' ? t('reminder.completed') : t('reminder.reopened'),
      description: reminder.recurrence !== 'none' && newStatus === 'completed' ? t('reminder.nextCreated') : ''
    });
    fetchReminders();
  };

  const handleDeleteReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      toast({ title: t('common.error'), description: t('reminder.deleteError'), variant: 'destructive' });
    } else {
      toast({ title: t('reminder.deleted'), description: '' });
      fetchReminders();
    }
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditReminderData({
      title: reminder.title,
      type: reminder.reminder_type,
      due_date: reminder.due_date,
      recurrence: (reminder.recurrence || 'none') as RecurrenceUnit,
      recurrence_interval: reminder.recurrence_interval || 1
    });
    setEditReminderOpen(true);
  };

  const handleUpdateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder || !editReminderData.title.trim() || !editReminderData.due_date) return;

    setSavingReminder(true);
    const { error } = await supabase
      .from('reminders')
      .update({
        title: editReminderData.title.trim(),
        reminder_type: editReminderData.type,
        due_date: editReminderData.due_date,
        recurrence: editReminderData.recurrence,
        recurrence_interval: editReminderData.recurrence_interval
      })
      .eq('id', editingReminder.id);

    if (error) {
      toast({ title: t('common.error'), description: t('reminder.updateError'), variant: 'destructive' });
    } else {
      toast({ title: t('reminder.updated'), description: '' });
      setEditReminderOpen(false);
      setEditingReminder(null);
      fetchReminders();
    }
    setSavingReminder(false);
  };

  const getUpcomingReminders = () => {
    const today = startOfDay(new Date());
    
    if (showAllReminders) {
      // Show all reminders (pending and completed)
      return reminders;
    }
    
    // Show all pending reminders (today and future)
    return reminders.filter(r => {
      const dueDate = startOfDay(parseISO(r.due_date));
      return r.status === 'pending' && dueDate >= today;
    });
  };

  const closeAllRemindersView = () => {
    setSearchParams({});
  };

  const getDaysUntilReminder = (dueDate: string) => {
    const today = startOfDay(new Date());
    const due = startOfDay(parseISO(dueDate));
    return differenceInDays(due, today);
  };

  const calculateAge = (birthDate: string) => {
    return calcAge(birthDate, language);
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'vaccination': return t('reminder.vaccination');
      case 'antiparasitic': return t('reminder.antiparasitic');
      case 'checkup': return t('reminder.checkup');
      default: return type;
    }
  };

  const upcomingReminders = getUpcomingReminders();

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
          <div className="text-start">
            <h1 className="text-2xl font-bold text-foreground">
              {showAllReminders ? t('dashboard.allReminders') : t('dashboard.myPets')}
            </h1>
            {showAllReminders && (
              <p className="text-muted-foreground text-sm">
                {t('dashboard.allRemindersDesc')}
              </p>
            )}
          </div>
          {showAllReminders ? (
            <Button size="icon" variant="outline" onClick={closeAllRemindersView} className="h-10 w-10">
              <X className="w-5 h-5" />
            </Button>
          ) : (
          <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="fab" className="h-12 w-12">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('pet.addNew')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPet} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('pet.type')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['dog', 'cat'] as PetType[]).map((type) => {
                      const Icon = petTypeIcons[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewPet({ ...newPet, pet_type: type })}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            newPet.pet_type === type
                              ? "border-primary bg-primary-soft"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-medium">{t(`pet.${type}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet-name">{t('pet.name')} *</Label>
                  <Input
                    id="pet-name"
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                    placeholder={t('pet.namePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet-breed">{t('pet.breed')}</Label>
                  <Input
                    id="pet-breed"
                    value={newPet.breed}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    placeholder={t('pet.breedPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('pet.birthDate')}</Label>
                    <DatePicker
                      date={newPet.birth_date ? parseISO(newPet.birth_date) : undefined}
                      onDateChange={(date) => setNewPet({ ...newPet, birth_date: date ? formatGregorian(date, 'yyyy-MM-dd') : '' })}
                      placeholder={t('common.selectDate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet-weight">{t('pet.weight')}</Label>
                    <Input
                      id="pet-weight"
                      type="number"
                      step="0.1"
                      value={newPet.weight}
                      onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                      placeholder={t('pet.weightPlaceholder')}
                    />
                  </div>
                </div>
                
                {/* Gender */}
                <div className="space-y-2">
                  <Label>{t('pet.gender')}</Label>
                  <RadioGroup 
                    value={newPet.gender}
                    onValueChange={(value) => setNewPet({ ...newPet, gender: value as Gender })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="gender-male" />
                      <Label htmlFor="gender-male" className="cursor-pointer font-normal">{t('pet.male')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="gender-female" />
                      <Label htmlFor="gender-female" className="cursor-pointer font-normal">{t('pet.female')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Neutered/Spayed */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="pet-neutered" className="cursor-pointer">{t('pet.neutered')}</Label>
                  <Switch 
                    id="pet-neutered"
                    checked={newPet.is_neutered}
                    onCheckedChange={(checked) => setNewPet({ ...newPet, is_neutered: checked })}
                  />
                </div>
                
                {/* Activity Level */}
                <div className="space-y-2">
                  <Label>{t('pet.activityLevel')}</Label>
                  <Select 
                    value={newPet.activity_level}
                    onValueChange={(value) => setNewPet({ ...newPet, activity_level: value as ActivityLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pet.activityLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('pet.activityLow')}</SelectItem>
                      <SelectItem value="moderate">{t('pet.activityModerate')}</SelectItem>
                      <SelectItem value="high">{t('pet.activityHigh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Allergies/Medical Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="pet-allergies">{t('pet.allergies')}</Label>
                  <Textarea
                    id="pet-allergies"
                    value={newPet.allergies}
                    onChange={(e) => setNewPet({ ...newPet, allergies: e.target.value })}
                    placeholder={t('pet.allergiesPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    rows={2}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={addingPet}>
                  {addingPet ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {addingPet ? t('pet.adding') : t('pet.add')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
          
          {/* Success Card with Health Tip */}
          <Dialog open={showSuccessCard} onOpenChange={setShowSuccessCard}>
            <DialogContent className="max-w-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t('pet.welcomeTitle')}</h2>
                  <p className="text-muted-foreground mt-1">
                    {t('pet.welcomeMessage').replace('{name}', addedPetName)}
                  </p>
                </div>
                
                {/* Health Tip Section */}
                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/10">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium text-sm">
                      {t('pet.healthTip').replace('{name}', addedPetName)}
                    </span>
                  </div>
                  {loadingTip ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{t('pet.loadingTip')}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
                      {healthTip}
                    </p>
                  )}
                </div>
                
                <Button onClick={handleCloseSuccessCard} className="w-full" disabled={loadingTip}>
                  {t('pet.gotIt')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>


        {/* All Reminders View */}
        {showAllReminders ? (
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                {t('dashboard.allReminders')}
                <span className="text-sm font-normal text-muted-foreground">
                  ({formatNumber(upcomingReminders.length, language)})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingReminders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('dashboard.noReminders')}</p>
              ) : (
                upcomingReminders.map((reminder) => {
                  const Icon = reminderTypeIcons[reminder.reminder_type] || Calendar;
                  const daysUntil = getDaysUntilReminder(reminder.due_date);
                  const isCompleted = reminder.status === 'completed';
                  
                  return (
                    <SwipeableReminder 
                      key={reminder.id}
                      onDelete={() => handleDeleteReminder(reminder.id)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border",
                          isCompleted ? "bg-muted/50 border-border" : reminderTypeColors[reminder.reminder_type]
                        )}
                        style={isRTL ? { direction: 'rtl' } : undefined}
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => handleToggleReminderStatus(reminder)}
                          className="shrink-0"
                        />
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Icon className="w-4 h-4 shrink-0" />
                        )}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleEditReminder(reminder)}
                        >
                          <div className="flex items-center gap-1">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isCompleted && "line-through opacity-60"
                            )}>{reminder.title}</p>
                            {reminder.recurrence && reminder.recurrence !== 'none' && (
                              <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs opacity-75">
                            <span>{formatShortDate(reminder.due_date, language)}</span>
                            {reminder.pet && (
                              <>
                                <span>•</span>
                                <span>{reminder.pet.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditReminder(reminder)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteReminder(reminder.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {!isCompleted && (
                          <span className={cn(
                            "text-xs font-semibold whitespace-nowrap px-2 py-1 rounded-full",
                            daysUntil === 0 && "bg-destructive/20 text-destructive",
                            daysUntil === 1 && "bg-warning/20 text-warning",
                            daysUntil > 1 && "bg-muted text-muted-foreground"
                          )}>
                            {daysUntil === 0 
                              ? t('reminder.today') 
                              : daysUntil === 1 
                                ? t('reminder.tomorrow')
                                : `${formatNumber(daysUntil, language)} ${t('reminder.days')}`
                            }
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-xs font-semibold whitespace-nowrap px-2 py-1 rounded-full bg-primary/20 text-primary">
                            {t('reminder.done')}
                          </span>
                        )}
                      </div>
                    </SwipeableReminder>
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Pets Grid */}
        {pets.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mb-4">
                <PawPrint className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{t('dashboard.noPets')}</h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                {t('dashboard.addFirstPet')}
              </p>
              <Button onClick={() => setAddPetOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                {t('dashboard.addPet')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pets.map((pet, index) => {
              const PetIcon = petTypeIcons[pet.pet_type] || PawPrint;
              const petReminders = upcomingReminders
                .filter(r => r.pet_id === pet.id)
                .sort((a, b) => getDaysUntilReminder(a.due_date) - getDaysUntilReminder(b.due_date));
              const hasReminders = petReminders.length > 0;
              
              return (
              <Card 
                key={pet.id} 
                className="pet-card card-elevated overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  {/* Clickable card header to expand/collapse */}
                  <div 
                    className={cn(
                      "flex items-center gap-4 cursor-pointer",
                      hasReminders && "hover:opacity-80 transition-opacity"
                    )}
                    onClick={() => hasReminders && setExpandedPetId(expandedPetId === pet.id ? null : pet.id)}
                  >
                    {/* Pet Avatar with Notification Dot */}
                    <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0 relative">
                      {pet.image_url ? (
                        <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <PetIcon className="w-7 h-7 text-primary" />
                      )}
                      {/* Notification Dot */}
                      {hasReminders && (
                        <span className="absolute -top-1 -end-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                          {petReminders.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{pet.name}</h3>
                        {hasReminders && (
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            expandedPetId === pet.id && "rotate-180"
                          )} />
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm truncate">
                        {t(`pet.${pet.pet_type}`)}
                        {pet.breed && ` • ${pet.breed}`}
                        {pet.gender && ` • ${t(`pet.${pet.gender}`)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pet.birth_date && calculateAge(pet.birth_date)}
                        {pet.birth_date && pet.weight && ' • '}
                        {pet.weight && `${formatNumber(pet.weight, language)} ${t('dashboard.kg')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPet(pet);
                        }} 
                        className="h-8 w-8"
                        title={t('pet.viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPet(pet);
                        }} 
                        className="h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expanded Reminders Section with Animation */}
                  {hasReminders && (
                    <Collapsible open={expandedPetId === pet.id}>
                      <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                          <div className="flex items-center gap-2 mb-3" style={isRTL ? { direction: 'rtl' } : undefined}>
                            <Bell className="w-4 h-4 text-warning" />
                            <span className="font-semibold text-sm">{t('dashboard.upcomingReminders')}</span>
                          </div>
                          {petReminders.map((reminder) => {
                            const Icon = reminderTypeIcons[reminder.reminder_type] || Calendar;
                            const daysUntil = getDaysUntilReminder(reminder.due_date);
                            
                            return (
                              <SwipeableReminder 
                                key={reminder.id}
                                onDelete={() => handleDeleteReminder(reminder.id)}
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-3 p-3 border",
                                    reminderTypeColors[reminder.reminder_type]
                                  )}
                                  style={isRTL ? { direction: 'rtl' } : undefined}
                                >
                                  <Checkbox
                                    checked={reminder.status === 'completed'}
                                    onCheckedChange={() => handleToggleReminderStatus(reminder)}
                                    className="shrink-0"
                                  />
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <div 
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleEditReminder(reminder)}
                                  >
                                    <div className="flex items-center gap-1">
                                      <p className={cn(
                                        "font-medium text-sm truncate",
                                        reminder.status === 'completed' && "line-through opacity-60"
                                      )}>{reminder.title}</p>
                                      {reminder.recurrence && reminder.recurrence !== 'none' && (
                                        <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-xs opacity-75">{formatShortDate(reminder.due_date, language)}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditReminder(reminder)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteReminder(reminder.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                  <span className={cn(
                                    "text-xs font-semibold whitespace-nowrap px-2 py-1 rounded-full",
                                    daysUntil === 0 && "bg-destructive/20 text-destructive",
                                    daysUntil === 1 && "bg-warning/20 text-warning",
                                    daysUntil > 1 && "bg-muted text-muted-foreground"
                                  )}>
                                    {daysUntil === 0 ? t('dashboard.today') : daysUntil === 1 ? t('dashboard.tomorrow') : `${formatNumber(daysUntil, language)} ${t('dashboard.daysLeft')}`}
                                  </span>
                                </div>
                              </SwipeableReminder>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  {/* Quick actions */}
                  <div className="flex gap-2 mt-4">
                    <Dialog open={addReminderOpen && selectedPetId === pet.id} onOpenChange={(open) => {
                      setAddReminderOpen(open);
                      if (open) setSelectedPetId(pet.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="soft" size="sm" className="flex-1">
                          <Bell className="w-4 h-4 me-1" />
                          {t('reminder.addNew')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>{t('reminder.addNew')} - {pet.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddReminder} className="space-y-4">
                          <div className="space-y-2">
                            <Label>{t('reminder.type')}</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(reminderTypeIcons).map(([type, Icon]) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setNewReminder({ ...newReminder, type })}
                                  className={cn(
                                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                                    newReminder.type === type
                                      ? "border-primary bg-primary-soft"
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  <Icon className="w-5 h-5" />
                                  <span className="text-xs">{getReminderTypeLabel(type)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reminder-title">{t('reminder.title')}</Label>
                            <Input
                              id="reminder-title"
                              value={newReminder.title}
                              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                              placeholder={t('reminder.titlePlaceholder')}
                              dir={isRTL ? 'rtl' : 'ltr'}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('reminder.dueDate')}</Label>
                            <DatePicker
                              date={newReminder.due_date ? parseISO(newReminder.due_date) : undefined}
                              onDateChange={(date) => setNewReminder({ ...newReminder, due_date: date ? formatGregorian(date, 'yyyy-MM-dd') : '' })}
                              placeholder={t('common.selectDate')}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('reminder.recurrence')}</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{t('reminder.every')}</span>
                              <select
                                value={newReminder.recurrence_interval}
                                onChange={(e) => setNewReminder({ ...newReminder, recurrence_interval: parseInt(e.target.value) })}
                                disabled={newReminder.recurrence === 'none'}
                                className={cn(
                                  "w-16 h-9 rounded-md border border-input bg-background px-2 text-sm",
                                  newReminder.recurrence === 'none' && "opacity-50"
                                )}
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                              <select
                                value={newReminder.recurrence}
                                onChange={(e) => setNewReminder({ ...newReminder, recurrence: e.target.value as RecurrenceUnit })}
                                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                              >
                                <option value="none">{t('reminder.noRepeat')}</option>
                                <option value="week">{t('reminder.weeks')}</option>
                                <option value="month">{t('reminder.months')}</option>
                                <option value="year">{t('reminder.years')}</option>
                              </select>
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={addingReminder}>
                            {addingReminder ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                            {addingReminder ? t('reminder.adding') : t('reminder.add')}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}

        {/* View Pet Details Dialog */}
        <Dialog open={!!viewingPet} onOpenChange={(open) => !open && setViewingPet(null)}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('pet.details')}</DialogTitle>
            </DialogHeader>
            {viewingPet && (() => {
              const PetIcon = petTypeIcons[viewingPet.pet_type] || Dog;
              return (
                <div className="space-y-4">
                  {/* Pet Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-primary-soft flex items-center justify-center overflow-hidden">
                      {viewingPet.image_url ? (
                        <img src={viewingPet.image_url} alt={viewingPet.name} className="w-full h-full object-cover" />
                      ) : (
                        <PetIcon className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl">{viewingPet.name}</h3>
                      <p className="text-muted-foreground">
                        {t(`pet.${viewingPet.pet_type}`)}
                        {viewingPet.breed && ` • ${viewingPet.breed}`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Pet Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {viewingPet.birth_date && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">{t('pet.birthDate')}</p>
                        <p className="font-medium">{calculateAge(viewingPet.birth_date)}</p>
                      </div>
                    )}
                    {viewingPet.gender && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">{t('pet.gender')}</p>
                        <p className="font-medium">{t(`pet.${viewingPet.gender}`)}</p>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground">{t('pet.neutered')}</p>
                      <p className="font-medium">{viewingPet.is_neutered ? t('common.yes') : t('common.no')}</p>
                    </div>
                    {viewingPet.activity_level && (
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">{t('pet.activityLevel')}</p>
                        <p className="font-medium">{t(`pet.activity${viewingPet.activity_level.charAt(0).toUpperCase() + viewingPet.activity_level.slice(1)}`)}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Allergies Section */}
                  {viewingPet.allergies && (
                    <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-xs text-warning font-medium mb-1">{t('pet.allergies')}</p>
                      <p className="text-sm">{viewingPet.allergies}</p>
                    </div>
                  )}
                  
                  {/* Weight Chart */}
                  <div className="border-t pt-4">
                    <PetWeightChart petId={viewingPet.id} currentWeight={viewingPet.weight} />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setViewingPet(null)}
                    >
                      {t('common.close')}
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => {
                        setViewingPet(null);
                        handleEditPet(viewingPet);
                      }}
                    >
                      <Pencil className="w-4 h-4 me-2" />
                      {t('pet.edit')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Edit Pet Dialog */}
        <Dialog open={editPetOpen} onOpenChange={(open) => {
          setEditPetOpen(open);
          if (!open) setEditingPet(null);
        }}>
          <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('pet.edit')}</DialogTitle>
            </DialogHeader>
            {editingPet && (
              <form onSubmit={handleUpdatePet} className="space-y-4">
                {/* Pet Image */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl bg-primary-soft flex items-center justify-center relative overflow-hidden">
                    {editingPet.image_url ? (
                      <img src={editingPet.image_url} alt={editingPet.name} className="w-full h-full object-cover" />
                    ) : (
                      <PawPrint className="w-10 h-10 text-primary" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                    <Camera className="w-4 h-4 me-2" />
                    {t('pet.changePhoto')}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>{t('pet.type')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['dog', 'cat'] as PetType[]).map((type) => {
                      const Icon = petTypeIcons[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEditPetData({ ...editPetData, pet_type: type })}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                            editPetData.pet_type === type
                              ? "border-primary bg-primary-soft"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{t(`pet.${type}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pet-name">{t('pet.name')} *</Label>
                  <Input
                    id="edit-pet-name"
                    value={editPetData.name}
                    onChange={(e) => setEditPetData({ ...editPetData, name: e.target.value })}
                    placeholder={t('pet.namePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pet-breed">{t('pet.breed')}</Label>
                  <Input
                    id="edit-pet-breed"
                    value={editPetData.breed}
                    onChange={(e) => setEditPetData({ ...editPetData, breed: e.target.value })}
                    placeholder={t('pet.breedPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('pet.birthDate')}</Label>
                    <DatePicker
                      date={editPetData.birth_date ? parseISO(editPetData.birth_date) : undefined}
                      onDateChange={(date) => setEditPetData({ ...editPetData, birth_date: date ? formatGregorian(date, 'yyyy-MM-dd') : '' })}
                      placeholder={t('common.selectDate')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pet-weight">{t('pet.weight')}</Label>
                    <Input
                      id="edit-pet-weight"
                      type="number"
                      step="0.1"
                      value={editPetData.weight}
                      onChange={(e) => setEditPetData({ ...editPetData, weight: e.target.value })}
                      placeholder={t('pet.weightPlaceholder')}
                    />
                  </div>
                </div>
                
                {/* Gender */}
                <div className="space-y-2">
                  <Label>{t('pet.gender')}</Label>
                  <RadioGroup 
                    value={editPetData.gender}
                    onValueChange={(value) => setEditPetData({ ...editPetData, gender: value as Gender })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="edit-gender-male" />
                      <Label htmlFor="edit-gender-male" className="cursor-pointer font-normal">{t('pet.male')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="edit-gender-female" />
                      <Label htmlFor="edit-gender-female" className="cursor-pointer font-normal">{t('pet.female')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Neutered/Spayed */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-pet-neutered" className="cursor-pointer">{t('pet.neutered')}</Label>
                  <Switch 
                    id="edit-pet-neutered"
                    checked={editPetData.is_neutered}
                    onCheckedChange={(checked) => setEditPetData({ ...editPetData, is_neutered: checked })}
                  />
                </div>
                
                {/* Activity Level */}
                <div className="space-y-2">
                  <Label>{t('pet.activityLevel')}</Label>
                  <Select 
                    value={editPetData.activity_level}
                    onValueChange={(value) => setEditPetData({ ...editPetData, activity_level: value as ActivityLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pet.activityLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('pet.activityLow')}</SelectItem>
                      <SelectItem value="moderate">{t('pet.activityModerate')}</SelectItem>
                      <SelectItem value="high">{t('pet.activityHigh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Allergies/Medical Conditions */}
                <div className="space-y-2">
                  <Label htmlFor="edit-pet-allergies">{t('pet.allergies')}</Label>
                  <Textarea
                    id="edit-pet-allergies"
                    value={editPetData.allergies}
                    onChange={(e) => setEditPetData({ ...editPetData, allergies: e.target.value })}
                    placeholder={t('pet.allergiesPlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    rows={2}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={editingPetLoading}>
                  {editingPetLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {editingPetLoading ? t('common.saving') : t('common.save')}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Reminder Dialog */}
        <Dialog open={editReminderOpen} onOpenChange={setEditReminderOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('reminder.edit')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateReminder} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('reminder.type')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(reminderTypeIcons).map(([type, Icon]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditReminderData({ ...editReminderData, type })}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                        editReminderData.type === type
                          ? "border-primary bg-primary-soft"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{getReminderTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reminder-title">{t('reminder.title')}</Label>
                <Input
                  id="edit-reminder-title"
                  value={editReminderData.title}
                  onChange={(e) => setEditReminderData({ ...editReminderData, title: e.target.value })}
                  placeholder={t('reminder.titlePlaceholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('reminder.dueDate')}</Label>
                <DatePicker
                  date={editReminderData.due_date ? parseISO(editReminderData.due_date) : undefined}
                  onDateChange={(date) => setEditReminderData({ ...editReminderData, due_date: date ? formatGregorian(date, 'yyyy-MM-dd') : '' })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('reminder.recurrence')}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('reminder.every')}</span>
                  <select
                    value={editReminderData.recurrence_interval}
                    onChange={(e) => setEditReminderData({ ...editReminderData, recurrence_interval: parseInt(e.target.value) })}
                    disabled={editReminderData.recurrence === 'none'}
                    className={cn(
                      "w-16 h-9 rounded-md border border-input bg-background px-2 text-sm",
                      editReminderData.recurrence === 'none' && "opacity-50"
                    )}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <select
                    value={editReminderData.recurrence}
                    onChange={(e) => setEditReminderData({ ...editReminderData, recurrence: e.target.value as RecurrenceUnit })}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="none">{t('reminder.noRepeat')}</option>
                    <option value="week">{t('reminder.weeks')}</option>
                    <option value="month">{t('reminder.months')}</option>
                    <option value="year">{t('reminder.years')}</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={savingReminder || !editReminderData.title.trim() || !editReminderData.due_date}>
                {savingReminder ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {savingReminder ? t('common.saving') : t('reminder.save')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
