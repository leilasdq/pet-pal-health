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
  const checkDueReminders = useCallback(async () => {
    if (!user || permission !== 'granted') return;

    try {
      // Get user's push notification preference
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (!profile?.push_notifications_enabled) return;

      // Get today's reminders
      const today = new Date().toISOString().split('T')[0];
      
      const { data: reminders } = await supabase
        .from('reminders')
        .select('id, title, reminder_type, pets(name)')
        .eq('due_date', today)
        .eq('status', 'pending');

      if (reminders && reminders.length > 0) {
        const petNames = [...new Set(reminders.map(r => (r.pets as any)?.name).filter(Boolean))];
        
        showNotification('🐾 PetCare Reminder', {
          body: `You have ${reminders.length} reminder${reminders.length > 1 ? 's' : ''} due today for ${petNames.join(', ')}`,
          tag: 'petcare-daily-reminder',
        });
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  }, [user, permission, showNotification]);

  // Run check on mount and periodically
  useEffect(() => {
    if (permission === 'granted' && user) {
      // Check immediately
      checkDueReminders();
      
      // Check every hour
      const interval = setInterval(checkDueReminders, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [permission, user, checkDueReminders]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    checkDueReminders,
  };
};
