import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionTier {
  id: string;
  name: string;
  display_name_fa: string;
  monthly_limit: number;
  price_toman: number;
}

interface UserSubscription {
  tier: SubscriptionTier | null;
  isSubscribed: boolean;
  isPaidUser: boolean;
  loading: boolean;
}

export const useSubscription = (): UserSubscription => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setTier(null);
        setLoading(false);
        return;
      }

      try {
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_tiers(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subData?.subscription_tiers) {
          setTier(subData.subscription_tiers as unknown as SubscriptionTier);
        } else {
          // Get free tier as default
          const { data: freeTier } = await supabase
            .from('subscription_tiers')
            .select('*')
            .eq('name', 'free')
            .maybeSingle();
          
          setTier(freeTier as SubscriptionTier | null);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setTier(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const isSubscribed = tier !== null;
  const isPaidUser = tier !== null && tier.name !== 'free';

  return { tier, isSubscribed, isPaidUser, loading };
};
