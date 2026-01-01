import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { User, Mail, LogOut, Loader2, PawPrint, Save, Heart, Globe, Bell, BellRing, Send } from 'lucide-react';
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { isSupported: pushSupported, permission: pushPermission, requestPermission, showNotification, checkDueReminders } = usePushNotifications();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: '' });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
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
    
    // Save immediately to database
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
        console.error('Error sending test email:', error);
        toast({ 
          title: t('common.error'), 
          description: t('profile.testEmailError'),
          variant: 'destructive' 
        });
      } else {
        console.log('Test email result:', data);
        toast({ 
          title: t('profile.testEmailSent'), 
          description: data?.message || t('profile.testEmailSentDesc')
        });
      }
    } catch (err) {
      console.error('Error:', err);
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
    // Check current permission
    let currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    // Request permission if not yet decided
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
      // Re-check permission after request
      currentPermission = Notification.permission;
    }
    
    // Check if denied
    if (currentPermission !== 'granted') {
      toast({ 
        title: t('profile.pushPermissionDenied'),
        description: t('profile.pushPermissionDeniedDesc'),
        variant: 'destructive'
      });
      return;
    }
    
    const success = showNotification('🐾 PetCare Test', {
      body: t('profile.testPushSent'),
      tag: 'petcare-test',
    });
    
    if (success) {
      toast({ 
        title: t('profile.testPushSent'),
        description: ''
      });
    } else {
      toast({ 
        title: t('profile.testPushError'),
        variant: 'destructive'
      });
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
          <Card 
            className="card-elevated text-center cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => navigate('/dashboard')}
          >
            <CardContent className="py-4">
              <PawPrint className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{formatNumber(stats.pets, language)}</p>
              <p className="text-xs text-muted-foreground">{t('profile.pets')}</p>
            </CardContent>
          </Card>
          <Card 
            className="card-elevated text-center cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => navigate('/vault')}
          >
            <CardContent className="py-4">
              <Heart className="w-6 h-6 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold">{formatNumber(stats.records, language)}</p>
              <p className="text-xs text-muted-foreground">{t('profile.records')}</p>
            </CardContent>
          </Card>
          <Card 
            className="card-elevated text-center cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => navigate('/reminders')}
          >
            <CardContent className="py-4">
              <Bell className="w-6 h-6 mx-auto text-secondary mb-1" />
              <p className="text-2xl font-bold">{formatNumber(stats.reminders, language)}</p>
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
                onClick={() => handleLanguageChange('en')}
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
                onClick={() => handleLanguageChange('fa')}
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

        {/* Notification Settings */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('profile.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <BellRing className="w-4 h-4" />
                  {t('profile.pushNotifications')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.pushNotificationsDesc')}
                </p>
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={handlePushToggle}
                disabled={!pushSupported}
              />
            </div>
            
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('profile.emailNotifications')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.emailNotificationsDesc')}
                </p>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>
            
            {!pushSupported && (
              <p className="text-xs text-muted-foreground">
                {t('profile.pushNotSupported')}
              </p>
            )}

            {/* Test Buttons */}
            <div className="pt-2 border-t border-border space-y-3">
              {/* Test Push Button */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestPush}
                  disabled={!pushSupported || pushPermission !== 'granted'}
                  className="w-full"
                >
                  <BellRing className="w-4 h-4 me-2" />
                  {t('profile.testPush')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {t('profile.testPushDesc')}
                </p>
              </div>

              {/* Test Email Button */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestEmail}
                  disabled={sendingTestEmail}
                  className="w-full"
                >
                  {sendingTestEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <Send className="w-4 h-4 me-2" />
                  )}
                  {t('profile.testEmail')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  {t('profile.testEmailDesc')}
                </p>
              </div>
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
