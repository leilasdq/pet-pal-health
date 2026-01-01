import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { User, Mail, LogOut, Loader2, PawPrint, Save, Heart, Globe, Bell, BellRing, Send, Crown, ChevronRight, Settings, FileText, CalendarClock, Shield } from 'lucide-react';
import { formatNumber } from '@/lib/dateUtils';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
}

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { isSupported: pushSupported, permission: pushPermission, requestPermission, showNotification } = usePushNotifications();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: '' });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [stats, setStats] = useState({ pets: 0, records: 0, reminders: 0 });
  const [showSettings, setShowSettings] = useState(false);

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
      setProfile(data as Profile);
      setFormData({ full_name: data.full_name || '' });
      setPushEnabled(data.push_notifications_enabled || false);
      setEmailEnabled(data.email_notifications_enabled ?? true);
    } else {
      setProfile({
        id: user.id,
        email: user.email || null,
        full_name: null,
        avatar_url: null,
        push_notifications_enabled: false,
        email_notifications_enabled: true,
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
        push_notifications_enabled: pushEnabled,
        email_notifications_enabled: emailEnabled,
        preferred_language: language,
      });
    
    if (error) {
      toast({ title: t('common.error'), description: t('profile.saveError'), variant: 'destructive' });
    } else {
      toast({ title: t('profile.saved'), description: '' });
      fetchProfile();
    }
    setSaving(false);
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && pushPermission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast({ 
          title: t('profile.pushPermissionDenied'), 
          description: t('profile.pushPermissionDeniedDesc'),
          variant: 'destructive' 
        });
        return;
      }
    }
    setPushEnabled(enabled);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_notifications_enabled: enabled })
        .eq('id', user.id);
      
      toast({ 
        title: enabled ? t('profile.pushEnabled') : t('profile.pushDisabled'),
        description: ''
      });
    }
  };

  const handleTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-reminder-email');
      
      if (error) {
        toast({ 
          title: t('common.error'), 
          description: t('profile.testEmailError'),
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: t('profile.testEmailSent'), 
          description: data?.message || t('profile.testEmailSentDesc')
        });
      }
    } catch (err) {
      toast({ 
        title: t('common.error'), 
        description: t('profile.testEmailError'),
        variant: 'destructive' 
      });
    }
    setSendingTestEmail(false);
  };

  const handleLanguageChange = async (lang: 'en' | 'fa') => {
    setLanguage(lang);
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id);
    }
  };

  const handleTestPush = async () => {
    let currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    if (currentPermission === 'default') {
      const granted = await requestPermission();
      if (!granted) {
        toast({ 
          title: t('profile.pushPermissionDenied'),
          description: t('profile.pushPermissionDeniedDesc'),
          variant: 'destructive'
        });
        return;
      }
      currentPermission = Notification.permission;
    }
    
    if (currentPermission !== 'granted') {
      toast({ 
        title: t('profile.pushPermissionDenied'),
        description: t('profile.pushPermissionDeniedDesc'),
        variant: 'destructive'
      });
      return;
    }
    
    const success = await showNotification('🐾 PetCare Test', {
      body: t('profile.testPushSent'),
      tag: 'petcare-test',
    });
    
    if (success) {
      toast({ title: t('profile.testPushSent'), description: '' });
    } else {
      toast({ title: t('profile.testPushError'), variant: 'destructive' });
    }
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
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Profile Header */}
        <div className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto flex items-center justify-center mb-3 shadow-glow">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">{profile?.full_name || 'Pet Parent'}</h1>
          <p className="text-muted-foreground text-sm">{profile?.email || user?.email}</p>
        </div>

        {/* Quick Stats - Beautiful Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-rose-500/5 p-4 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-rose-500/10 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mb-2 mx-auto group-hover:bg-rose-500/30 transition-colors">
                <PawPrint className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-500 mb-0.5">{formatNumber(stats.pets, language)}</p>
              <p className="text-xs text-muted-foreground font-medium">{t('profile.pets')}</p>
            </div>
          </button>

          <button 
            onClick={() => navigate('/vault')} 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/5 p-4 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2 mx-auto group-hover:bg-blue-500/30 transition-colors">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-500 mb-0.5">{formatNumber(stats.records, language)}</p>
              <p className="text-xs text-muted-foreground font-medium">{t('profile.records')}</p>
            </div>
          </button>

          <button 
            onClick={() => navigate('/reminders')} 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-2 mx-auto group-hover:bg-amber-500/30 transition-colors">
                <CalendarClock className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-500 mb-0.5">{formatNumber(stats.reminders, language)}</p>
              <p className="text-xs text-muted-foreground font-medium">{t('profile.reminders')}</p>
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <Card className="card-elevated overflow-hidden">
          <CardContent className="p-0 divide-y divide-border/50">
            {/* Subscription */}
            <button 
              onClick={() => navigate('/subscription')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <span className="font-medium">{language === 'fa' ? 'اشتراک و پلن‌ها' : 'Subscription'}</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {/* Admin Panel - Only for admins */}
            {isAdmin && (
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="font-medium">{language === 'fa' ? 'پنل مدیریت' : 'Admin Panel'}</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Language */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-medium">{t('profile.language')}</span>
              </div>
              <div className="flex gap-2 ms-12">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    language === 'en'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => handleLanguageChange('fa')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium font-vazirmatn transition-all ${
                    language === 'fa'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  🇮🇷 فارسی
                </button>
              </div>
            </div>

            {/* Notifications Toggle */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-green-500" />
                </div>
                <span className="font-medium">{t('profile.notifications')}</span>
              </div>
              <div className="ms-12 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('profile.pushNotifications')}</span>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handlePushToggle}
                    disabled={!pushSupported}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('profile.emailNotifications')}</span>
                  <Switch
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Settings - Expandable */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-500/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-gray-500" />
                </div>
                <span className="font-medium">{t('profile.editProfile')}</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showSettings ? 'rotate-90' : ''} ${isRTL && !showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && (
              <div className="p-4 bg-muted/30">
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="full-name" className="text-sm">{t('profile.fullName')}</Label>
                    <Input
                      id="full-name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder={isRTL ? "مثلاً: علی احمدی" : "John Doe"}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('profile.email')}</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-muted h-10"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
                    {t('profile.save')}
                  </Button>
                </form>

                {/* Test Buttons - Compact */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestPush}
                    disabled={!pushSupported || pushPermission !== 'granted'}
                    className="flex-1 text-xs"
                  >
                    <BellRing className="w-3 h-3 me-1" />
                    {t('profile.testPush')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestEmail}
                    disabled={sendingTestEmail}
                    className="flex-1 text-xs"
                  >
                    {sendingTestEmail ? (
                      <Loader2 className="w-3 h-3 animate-spin me-1" />
                    ) : (
                      <Send className="w-3 h-3 me-1" />
                    )}
                    {t('profile.testEmail')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="ghost" 
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 me-2" />
          {t('profile.signOut')}
        </Button>

        {/* App Info */}
        <p className="text-center text-xs text-muted-foreground">PetCare v1.0.0</p>
      </div>
    </AppLayout>
  );
};

export default Profile;
