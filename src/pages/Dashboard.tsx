import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, PawPrint, Calendar, Bell, Syringe, Bug, Stethoscope, ChevronRight, Loader2, Dog, Cat, Pencil, Camera } from 'lucide-react';
import { differenceInDays, parseISO, isWithinInterval, addDays, format as formatGregorian } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatShortDate, calculateAge as calcAge } from '@/lib/dateUtils';
import { DatePicker } from '@/components/ui/date-picker';

type PetType = 'dog' | 'cat';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  image_url: string | null;
  pet_type: PetType;
}

interface Reminder {
  id: string;
  pet_id: string;
  title: string;
  reminder_type: string;
  due_date: string;
  status: string;
  pet?: Pet;
}

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
  const { toast } = useToast();
  const { t, isRTL, language } = useLanguage();
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [editPetOpen, setEditPetOpen] = useState(false);
  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [newPet, setNewPet] = useState({ name: '', breed: '', birth_date: '', weight: '', pet_type: 'dog' as PetType });
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editPetData, setEditPetData] = useState({ name: '', breed: '', birth_date: '', weight: '', pet_type: 'dog' as PetType });
  const [newReminder, setNewReminder] = useState({ title: '', type: 'vaccination', due_date: '' });
  const [addingPet, setAddingPet] = useState(false);
  const [editingPetLoading, setEditingPetLoading] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const { error } = await supabase.from('pets').insert({
      user_id: user.id,
      name: newPet.name,
      breed: newPet.breed || null,
      birth_date: newPet.birth_date || null,
      weight: newPet.weight ? parseFloat(newPet.weight) : null,
      pet_type: newPet.pet_type,
    });

    if (error) {
      toast({ title: t('common.error'), description: t('pet.addError'), variant: 'destructive' });
    } else {
      toast({ title: t('pet.added'), description: '' });
      setNewPet({ name: '', breed: '', birth_date: '', weight: '', pet_type: 'dog' });
      setAddPetOpen(false);
      fetchPets();
    }
    setAddingPet(false);
  };

  const handleEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setEditPetData({
      name: pet.name,
      breed: pet.breed || '',
      birth_date: pet.birth_date || '',
      weight: pet.weight?.toString() || '',
      pet_type: pet.pet_type || 'dog',
    });
    setEditPetOpen(true);
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    setEditingPetLoading(true);
    const { error } = await supabase.from('pets').update({
      name: editPetData.name,
      breed: editPetData.breed || null,
      birth_date: editPetData.birth_date || null,
      weight: editPetData.weight ? parseFloat(editPetData.weight) : null,
      pet_type: editPetData.pet_type,
    }).eq('id', editingPet.id);

    if (error) {
      toast({ title: t('common.error'), description: t('pet.updateError'), variant: 'destructive' });
    } else {
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
    });

    if (error) {
      toast({ title: t('common.error'), description: t('reminder.addError'), variant: 'destructive' });
    } else {
      toast({ title: t('reminder.added'), description: '' });
      setNewReminder({ title: '', type: 'vaccination', due_date: '' });
      setAddReminderOpen(false);
      fetchReminders();
    }
    setAddingReminder(false);
  };

  const getUpcomingReminders = () => {
    const today = new Date();
    const weekFromNow = addDays(today, 7);
    
    return reminders.filter(r => {
      const dueDate = parseISO(r.due_date);
      return r.status === 'pending' && isWithinInterval(dueDate, { start: today, end: weekFromNow });
    });
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
            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.myPets')}</h1>
            <p className="text-muted-foreground text-sm">{t('dashboard.next7Days')}</p>
          </div>
          <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="fab" className="h-12 w-12">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
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
                <Button type="submit" className="w-full" disabled={addingPet}>
                  {addingPet ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {addingPet ? t('pet.adding') : t('pet.add')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <Card className="card-elevated border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-warning" />
                {t('dashboard.upcomingReminders')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingReminders.slice(0, 3).map((reminder) => {
                const Icon = reminderTypeIcons[reminder.reminder_type] || Calendar;
                const daysUntil = differenceInDays(parseISO(reminder.due_date), new Date());
                
                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border",
                      reminderTypeColors[reminder.reminder_type]
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-start">{reminder.title}</p>
                      <p className="text-xs opacity-75 text-start">{reminder.pet?.name}</p>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap reminder-pulse">
                      {daysUntil === 0 ? t('dashboard.today') : daysUntil === 1 ? t('dashboard.tomorrow') : `${daysUntil} ${t('dashboard.daysLeft')}`}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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
              return (
              <Card 
                key={pet.id} 
                className="pet-card card-elevated overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0 relative">
                      {pet.image_url ? (
                        <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <PetIcon className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{pet.name}</h3>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{t(`pet.${pet.pet_type}`)}</span>
                      </div>
                      <p className="text-muted-foreground text-sm truncate">
                        {pet.breed || t('dashboard.unknownBreed')}
                        {pet.birth_date && ` • ${calculateAge(pet.birth_date)}`}
                      </p>
                      {pet.weight && (
                        <p className="text-xs text-muted-foreground mt-1">{pet.weight} {t('dashboard.kg')}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEditPet(pet)} className="shrink-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  
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

        {/* Edit Pet Dialog */}
        <Dialog open={editPetOpen} onOpenChange={(open) => {
          setEditPetOpen(open);
          if (!open) setEditingPet(null);
        }}>
          <DialogContent className="max-w-sm">
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
                <Button type="submit" className="w-full" disabled={editingPetLoading}>
                  {editingPetLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                  {editingPetLoading ? t('common.saving') : t('common.save')}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* All Reminders Section */}
        {reminders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-start">{t('dashboard.upcomingReminders')}</h2>
            {reminders.map((reminder) => {
              const Icon = reminderTypeIcons[reminder.reminder_type] || Calendar;
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    reminder.status === 'completed' ? 'bg-muted/50 opacity-60' : reminderTypeColors[reminder.reminder_type]
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex-1 min-w-0 text-start">
                    <p className="font-medium text-sm">{reminder.title}</p>
                    <p className="text-xs opacity-75">
                      {reminder.pet?.name} • {formatShortDate(reminder.due_date, language)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
