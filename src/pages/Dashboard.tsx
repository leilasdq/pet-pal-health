import { useState, useEffect } from 'react';
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
import { Plus, PawPrint, Calendar, Bell, Syringe, Bug, Stethoscope, ChevronRight, Loader2 } from 'lucide-react';
import { format, differenceInDays, parseISO, isWithinInterval, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  image_url: string | null;
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

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [newPet, setNewPet] = useState({ name: '', breed: '', birth_date: '', weight: '' });
  const [newReminder, setNewReminder] = useState({ title: '', type: 'vaccination', due_date: '' });

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
      toast({ title: 'Error', description: 'Failed to load pets', variant: 'destructive' });
    } else {
      setPets(data || []);
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

    const { error } = await supabase.from('pets').insert({
      user_id: user.id,
      name: newPet.name,
      breed: newPet.breed || null,
      birth_date: newPet.birth_date || null,
      weight: newPet.weight ? parseFloat(newPet.weight) : null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add pet', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `${newPet.name} has been added!` });
      setNewPet({ name: '', breed: '', birth_date: '', weight: '' });
      setAddPetOpen(false);
      fetchPets();
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId) return;

    const { error } = await supabase.from('reminders').insert({
      pet_id: selectedPetId,
      title: newReminder.title,
      reminder_type: newReminder.type,
      due_date: newReminder.due_date,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add reminder', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Reminder added!' });
      setNewReminder({ title: '', type: 'vaccination', due_date: '' });
      setAddReminderOpen(false);
      fetchReminders();
    }
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
    const days = differenceInDays(new Date(), parseISO(birthDate));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years}y ${months}m`;
    return `${months} months`;
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Pets</h1>
            <p className="text-muted-foreground text-sm">Manage your furry friends</p>
          </div>
          <Dialog open={addPetOpen} onOpenChange={setAddPetOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="fab" className="h-12 w-12">
                <Plus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add New Pet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pet-name">Name *</Label>
                  <Input
                    id="pet-name"
                    value={newPet.name}
                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                    placeholder="Buddy"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pet-breed">Breed</Label>
                  <Input
                    id="pet-breed"
                    value={newPet.breed}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    placeholder="Golden Retriever"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet-birth">Birth Date</Label>
                    <Input
                      id="pet-birth"
                      type="date"
                      value={newPet.birth_date}
                      onChange={(e) => setNewPet({ ...newPet, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet-weight">Weight (kg)</Label>
                    <Input
                      id="pet-weight"
                      type="number"
                      step="0.1"
                      value={newPet.weight}
                      onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                      placeholder="12.5"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Pet</Button>
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
                Upcoming This Week
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
                      <p className="font-medium text-sm truncate">{reminder.title}</p>
                      <p className="text-xs opacity-75">{reminder.pet?.name}</p>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap reminder-pulse">
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
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
              <h3 className="text-lg font-semibold mb-1">No pets yet</h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Add your first pet to start tracking their health
              </p>
              <Button onClick={() => setAddPetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pets.map((pet, index) => (
              <Card 
                key={pet.id} 
                className="pet-card card-elevated overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0">
                      {pet.image_url ? (
                        <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <PawPrint className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg">{pet.name}</h3>
                      <p className="text-muted-foreground text-sm truncate">
                        {pet.breed || 'Unknown breed'}
                        {pet.birth_date && ` • ${calculateAge(pet.birth_date)}`}
                      </p>
                      {pet.weight && (
                        <p className="text-xs text-muted-foreground mt-1">{pet.weight} kg</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  
                  {/* Quick actions */}
                  <div className="flex gap-2 mt-4">
                    <Dialog open={addReminderOpen && selectedPetId === pet.id} onOpenChange={(open) => {
                      setAddReminderOpen(open);
                      if (open) setSelectedPetId(pet.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="soft" size="sm" className="flex-1">
                          <Bell className="w-4 h-4 mr-1" />
                          Add Reminder
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Add Reminder for {pet.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddReminder} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Reminder Type</Label>
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
                                  <span className="text-xs capitalize">{type}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reminder-title">Title</Label>
                            <Input
                              id="reminder-title"
                              value={newReminder.title}
                              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                              placeholder="Annual vaccination"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reminder-date">Due Date</Label>
                            <Input
                              id="reminder-date"
                              type="date"
                              value={newReminder.due_date}
                              onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                              required
                            />
                          </div>
                          <Button type="submit" className="w-full">Add Reminder</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All Reminders Section */}
        {reminders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">All Reminders</h2>
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{reminder.title}</p>
                    <p className="text-xs opacity-75">
                      {reminder.pet?.name} • {format(parseISO(reminder.due_date), 'MMM d, yyyy')}
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
