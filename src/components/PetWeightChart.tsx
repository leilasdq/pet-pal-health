import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Plus, Loader2, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { format as formatGregorian, parseISO } from 'date-fns';
import { formatNumber } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface WeightEntry {
  id: string;
  pet_id: string;
  weight: number;
  recorded_at: string;
  notes: string | null;
}

interface PetWeightChartProps {
  petId: string;
  currentWeight: number | null;
}

export function PetWeightChart({ petId, currentWeight }: PetWeightChartProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'fa';

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetchWeightHistory();
  }, [petId]);

  const fetchWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('pet_id', petId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setWeightHistory(data || []);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || !newDate) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          pet_id: petId,
          weight: parseFloat(newWeight),
          recorded_at: formatGregorian(newDate, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      toast({
        title: t('weight.added'),
      });

      setNewWeight('');
      setNewDate(new Date());
      setAddDialogOpen(false);
      fetchWeightHistory();
    } catch (error) {
      console.error('Error adding weight:', error);
      toast({
        title: t('weight.addError'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWeight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('weight.deleted'),
      });

      fetchWeightHistory();
    } catch (error) {
      console.error('Error deleting weight:', error);
      toast({
        title: t('weight.deleteError'),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (language === 'fa') {
      // Simple Persian month abbreviation
      const months = ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];
      const d = new Date(dateStr);
      // Approximate conversion - just show the date in a readable format
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }
    return formatGregorian(date, 'MMM d');
  };

  const chartData = weightHistory.map((entry) => ({
    date: formatDate(entry.recorded_at),
    weight: entry.weight,
    fullDate: entry.recorded_at,
    id: entry.id,
  }));

  // Calculate weight trend
  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[weightHistory.length - 1].weight;
    const previous = weightHistory[weightHistory.length - 2].weight;
    const diff = latest - previous;
    return { diff, percentage: ((diff / previous) * 100).toFixed(1) };
  };

  const trend = getWeightTrend();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{t('weight.history')}</h4>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 me-1" />
              {t('weight.add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>{t('weight.addNew')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddWeight} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('weight.value')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder={t('pet.weightPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('weight.date')}</Label>
                <DatePicker
                  date={newDate}
                  onDateChange={setNewDate}
                  placeholder={t('common.selectDate')}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setAddDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('weight.add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {weightHistory.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>{t('weight.noData')}</p>
          <p className="text-xs mt-1">{t('weight.startTracking')}</p>
        </div>
      ) : (
        <>
          {/* Weight Trend */}
          {trend && (
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg text-sm",
              trend.diff > 0 ? "bg-success/10 text-success" : trend.diff < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              {trend.diff > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : trend.diff < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>
                {trend.diff > 0 ? '+' : ''}{formatNumber(trend.diff, language)} {t('dashboard.kg')} ({trend.diff > 0 ? '+' : ''}{trend.percentage}%)
              </span>
            </div>
          )}

          {/* Chart */}
          <div className="h-40" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${formatNumber(value, language)} ${t('dashboard.kg')}`, t('pet.weight')]}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weight History List */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {[...weightHistory].reverse().slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(entry.weight, language)} {t('dashboard.kg')}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(entry.recorded_at)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteWeight(entry.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
