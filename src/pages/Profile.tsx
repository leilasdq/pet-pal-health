import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Mail, LogOut, Loader2, PawPrint, Save, Heart, Globe } from 'lucide-react';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language, setLanguage, isRTL } = useLanguage();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: '' });
  const [stats, setStats] = useState({ pets: 0, records: 0, reminders: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data);
      setFormData({ full_name: data.full_name || '' });
    } else {
      setProfile({
        id: user.id,
        email: user.email || null,
        full_name: null,
        avatar_url: null,
      });
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const [petsRes, recordsRes, remindersRes] = await Promise.all([
      supabase.from('pets').select('id', { count: 'exact', head: true }),
      supabase.from('medical_records').select('id', { count: 'exact', head: true }),
      supabase.from('reminders').select('id', { count: 'exact', head: true }),
    ]);
    
    setStats({
      pets: petsRes.count || 0,
      records: recordsRes.count || 0,
      reminders: remindersRes.count || 0,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: formData.full_name,
        email: user.email,
      });
    
    if (error) {
      toast({ title: t('common.error'), description: t('profile.saveError'), variant: 'destructive' });
    } else {
      toast({ title: t('profile.saved'), description: '' });
      fetchProfile();
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-primary mx-auto flex items-center justify-center mb-4 shadow-glow">
            <User className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{profile?.full_name || 'Pet Parent'}</h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
            <Mail className="w-4 h-4" />
            {profile?.email || user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="card-elevated text-center">
            <CardContent className="py-4">
              <PawPrint className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.pets}</p>
              <p className="text-xs text-muted-foreground">{t('profile.pets')}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated text-center">
            <CardContent className="py-4">
              <Heart className="w-6 h-6 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold">{stats.records}</p>
              <p className="text-xs text-muted-foreground">{t('profile.records')}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated text-center">
            <CardContent className="py-4">
              <PawPrint className="w-6 h-6 mx-auto text-secondary mb-1" />
              <p className="text-2xl font-bold">{stats.reminders}</p>
              <p className="text-xs text-muted-foreground">{t('profile.reminders')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Language Toggle */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('profile.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  language === 'en'
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-2xl mb-1 block">🇬🇧</span>
                <span className="font-medium">{t('profile.english')}</span>
              </button>
              <button
                onClick={() => setLanguage('fa')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  language === 'fa'
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="text-2xl mb-1 block">🇮🇷</span>
                <span className="font-medium font-vazirmatn">{t('profile.persian')}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">{t('profile.editProfile')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">{t('profile.fullName')}</Label>
                <Input
                  id="full-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={isRTL ? "مثلاً: علی احمدی" : "John Doe"}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.email')}</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                {t('profile.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 me-2" />
          {t('profile.signOut')}
        </Button>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>PetCare v1.0.0</p>
          <p>Made with ❤️ for pet parents</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Profile;
