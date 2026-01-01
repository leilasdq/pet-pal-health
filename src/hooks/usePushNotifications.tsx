import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions): Promise<boolean> => {
    // Check actual browser permission, not just React state
    const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    console.log('showNotification called:', { isSupported, currentPermission, title });
    
    if (!isSupported || currentPermission !== 'granted') {
      console.log('Notification blocked:', { isSupported, currentPermission });
      return false;
    }
    
    try {
      // Try Service Worker first (required for mobile browsers)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
        console.log('Notification sent via Service Worker');
        return true;
      }
      
      // Fallback to regular Notification API (works on desktop)
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      
      console.log('Notification sent via Notification API');
      
      // Update state if it was out of sync
      if (permission !== currentPermission) {
        setPermission(currentPermission);
      }
      
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [isSupported, permission]);

  // Check for due reminders and show notifications
  const checkDueReminders = useCallback(async (language: 'en' | 'fa' = 'en') => {
    if (!user) return;
    
    // Check browser permission directly
    const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    if (currentPermission !== 'granted') return;

    try {
      // Get user's push notification preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (!profile?.push_notifications_enabled) return;

      // Get today and tomorrow's dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // Get today's reminders
      const { data: todayReminders } = await supabase
        .from('reminders')
        .select('id, title, reminder_type, pets(name)')
        .eq('due_date', todayStr)
        .eq('status', 'pending');

      // Get tomorrow's reminders
      const { data: tomorrowReminders } = await supabase
        .from('reminders')
        .select('id, title, reminder_type, pets(name)')
        .eq('due_date', tomorrowStr)
        .eq('status', 'pending');

      // Show today's reminders
      if (todayReminders && todayReminders.length > 0) {
        for (const reminder of todayReminders) {
          const petName = (reminder.pets as any)?.name || '';
          const reminderTypeText = getReminderTypeText(reminder.reminder_type, language);
          
          const title = language === 'fa' 
            ? `🐾 امروز وقت ${reminderTypeText} ${petName} است!` 
            : `🐾 ${petName}'s ${reminderTypeText} is today!`;
          
          const body = language === 'fa' 
            ? `سلام! یادت نره که امروز باید ${reminder.title} رو انجام بدی. ${petName} منتظرته! 💕`
            : `Hey! Don't forget to complete "${reminder.title}" today. ${petName} is counting on you! 💕`;
          
          await showNotification(title, {
            body,
            tag: `reminder-today-${reminder.id}`,
          });
        }
      }

      // Show tomorrow's reminders
      if (tomorrowReminders && tomorrowReminders.length > 0) {
        for (const reminder of tomorrowReminders) {
          const petName = (reminder.pets as any)?.name || '';
          const reminderTypeText = getReminderTypeText(reminder.reminder_type, language);
          
          const title = language === 'fa' 
            ? `📅 آماده باش! فردا ${reminderTypeText} داری` 
            : `📅 Heads up! ${reminderTypeText} tomorrow`;
          
          const body = language === 'fa' 
            ? `فردا نوبت ${reminder.title} برای ${petName} عزیزته. از الان برنامه‌ریزی کن! 🗓️`
            : `Tomorrow is ${petName}'s "${reminder.title}" day. Plan ahead! 🗓️`;
          
          await showNotification(title, {
            body,
            tag: `reminder-tomorrow-${reminder.id}`,
          });
        }
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  }, [user, showNotification]);

  // Helper function to get reminder type text
  const getReminderTypeText = (type: string, language: 'en' | 'fa'): string => {
    const types: Record<string, Record<'en' | 'fa', string>> = {
      vaccination: { en: 'a vaccination', fa: 'واکسیناسیون' },
      antiparasitic: { en: 'an anti-parasitic treatment', fa: 'ضد انگل' },
      checkup: { en: 'a vet checkup', fa: 'ویزیت دامپزشک' },
    };
    return types[type]?.[language] || (language === 'fa' ? 'یادآوری' : 'a reminder');
  };

  // Run check on mount and periodically
  useEffect(() => {
    const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    if (currentPermission === 'granted' && user) {
      // Get language from localStorage
      const savedLanguage = (localStorage.getItem('petcare-language') as 'en' | 'fa') || 'fa';
      
      // Check immediately
      checkDueReminders(savedLanguage);
      
      // Check every hour
      const interval = setInterval(() => checkDueReminders(savedLanguage), 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [user, checkDueReminders]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    checkDueReminders,
  };
};
