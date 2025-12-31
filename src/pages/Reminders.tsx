import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { SwipeableReminder } from '@/components/SwipeableReminder';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Bell, Calendar, Syringe, Bug, Stethoscope, Loader2, 
  Pencil, Trash2, Repeat, CheckCircle2, Clock, ListTodo 
} from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, format as formatGregorian, addWeeks, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatShortDate, formatNumber } from '@/lib/dateUtils';

type FilterType = 'all' | 'pending' | 'completed';
type RecurrenceUnit = 'none' | 'week' | 'month' | 'year';

interface Pet {
  id: string;
  name: string;
  pet_type: string;
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

const Reminders = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, isRTL, language } = useLanguage();
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Edit reminder state
  const [editReminderOpen, setEditReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editReminderData, setEditReminderData] = useState({ 
    title: '', 
    type: 'vaccination', 
    due_date: '', 
    recurrence: 'none' as RecurrenceUnit, 
    recurrence_interval: 1 
  });
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*, pets(id, name, pet_type)')
      .order('due_date', { ascending: true });
    
    if (!error && data) {
      const mappedReminders = data.map(r => ({
        ...r,
        pet: r.pets as Pet | undefined,
      }));
      setReminders(mappedReminders);
    }
    setLoading(false);
  };

  const getFilteredReminders = () => {
    switch (filter) {
      case 'pending':
        return reminders.filter(r => r.status === 'pending');
      case 'completed':
        return reminders.filter(r => r.status === 'completed');
      default:
        return reminders;
    }
  };

  const getDaysUntilReminder = (dueDate: string) => {
    const today = startOfDay(new Date());
    const due = startOfDay(parseISO(dueDate));
    return differenceInDays(due, today);
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

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'vaccination': return t('reminder.vaccination');
      case 'antiparasitic': return t('reminder.antiparasitic');
      case 'checkup': return t('reminder.checkup');
      default: return type;
    }
  };

  const filteredReminders = getFilteredReminders();
  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const completedCount = reminders.filter(r => r.status === 'completed').length;

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
        <div className="text-start">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            {t('reminders.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('reminders.subtitle')}</p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              filter === 'all'
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <ListTodo className="w-4 h-4" />
            {t('reminders.all')}
            <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
              {formatNumber(reminders.length, language)}
            </span>
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              filter === 'pending'
                ? "bg-warning text-warning-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Clock className="w-4 h-4" />
            {t('reminders.pending')}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              filter === 'pending' ? "bg-background/20" : "bg-warning/20 text-warning"
            )}>
              {formatNumber(pendingCount, language)}
            </span>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              filter === 'completed'
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {t('reminders.completed')}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              filter === 'completed' ? "bg-background/20" : "bg-primary/20 text-primary"
            )}>
              {formatNumber(completedCount, language)}
            </span>
          </button>
        </div>

        {/* Reminders List */}
        <Card className="card-elevated">
          <CardContent className="p-4 space-y-2">
            {filteredReminders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  {filter === 'completed' ? (
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-muted-foreground">
                  {filter === 'completed' 
                    ? t('reminders.noCompleted') 
                    : filter === 'pending'
                      ? t('reminders.noPending')
                      : t('dashboard.noReminders')
                  }
                </p>
              </div>
            ) : (
              filteredReminders.map((reminder) => {
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
                          daysUntil < 0 && "bg-destructive/20 text-destructive",
                          daysUntil === 0 && "bg-destructive/20 text-destructive",
                          daysUntil === 1 && "bg-warning/20 text-warning",
                          daysUntil > 1 && "bg-muted text-muted-foreground"
                        )}>
                          {daysUntil < 0
                            ? t('reminder.overdue')
                            : daysUntil === 0 
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

        {/* Edit Reminder Dialog */}
        <Dialog open={editReminderOpen} onOpenChange={setEditReminderOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('reminder.edit')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateReminder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-reminder-title">{t('reminder.title')} *</Label>
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
                <Label>{t('reminder.type')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['vaccination', 'antiparasitic', 'checkup'].map((type) => {
                    const Icon = reminderTypeIcons[type];
                    return (
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
                        <span className="text-xs font-medium">{getReminderTypeLabel(type)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('reminder.dueDate')} *</Label>
                <DatePicker
                  date={editReminderData.due_date ? parseISO(editReminderData.due_date) : undefined}
                  onDateChange={(date) => setEditReminderData({ ...editReminderData, due_date: date ? formatGregorian(date, 'yyyy-MM-dd') : '' })}
                  placeholder={t('common.selectDate')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('reminder.recurrence')}</Label>
                <div className="flex gap-2">
                  <select
                    value={editReminderData.recurrence_interval}
                    onChange={(e) => setEditReminderData({ ...editReminderData, recurrence_interval: parseInt(e.target.value) })}
                    className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={editReminderData.recurrence === 'none'}
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
      </div>
    </AppLayout>
  );
};

export default Reminders;
