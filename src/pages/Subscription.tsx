import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Check, Crown, Sparkles, Zap, Gift, ArrowRight, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

interface Tier {
  id: string;
  name: string;
  display_name_fa: string;
  price_toman: number;
  monthly_limit: number;
  grace_buffer: number;
}

interface UsageInfo {
  chatbot_count: number;
  analysis_count: number;
  total_count: number;
}

const Subscription = () => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isFarsi = language === 'fa';

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch tiers
      const { data: tiersData } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('price_toman');

      if (tiersData) setTiers(tiersData);

      // Fetch user's current subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_tiers(*)')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData?.subscription_tiers) {
        setCurrentTier(subData.subscription_tiers as unknown as Tier);
      } else if (tiersData) {
        setCurrentTier(tiersData.find(t => t.name === 'free') || null);
      }

      // Fetch usage
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', user!.id)
        .eq('month_year', currentMonth)
        .maybeSingle();

      setUsage(usageData || { chatbot_count: 0, analysis_count: 0, total_count: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePromoCode = async (tierId: string) => {
    if (!promoCode.trim()) return;
    
    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: promoCode, tier_id: tierId }
      });

      if (error) throw error;

      if (data.valid) {
        setPromoApplied({ ...data, tierId });
        toast({
          title: isFarsi ? 'کد تخفیف اعمال شد' : 'Promo code applied',
          description: data.messageFa || data.message,
        });
      } else {
        toast({
          title: isFarsi ? 'خطا' : 'Error',
          description: data.errorFa || data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating promo:', error);
      toast({
        title: isFarsi ? 'خطا' : 'Error',
        description: isFarsi ? 'خطا در بررسی کد تخفیف' : 'Error validating promo code',
        variant: 'destructive',
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleUpgrade = async (tier: Tier) => {
    if (tier.price_toman === 0) return;
    
    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          tier_id: tier.id,
          promo_code_id: promoApplied?.tierId === tier.id ? promoApplied.promoCodeId : null,
          callback_url: `${window.location.origin}/payment-success`,
        }
      });

      if (error) throw error;

      if (data.free) {
        toast({
          title: isFarsi ? 'اشتراک فعال شد' : 'Subscription activated',
          description: data.messageFa || data.message,
        });
        fetchData();
      } else if (data.demo) {
        toast({
          title: isFarsi ? 'حالت آزمایشی' : 'Demo mode',
          description: data.messageFa || data.message,
        });
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: isFarsi ? 'خطا' : 'Error',
        description: isFarsi ? 'خطا در ایجاد پرداخت' : 'Error creating payment',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTierIcon = (name: string) => {
    switch (name) {
      case 'pro': return <Crown className="h-6 w-6" />;
      case 'basic': return <Zap className="h-6 w-6" />;
      default: return <Sparkles className="h-6 w-6" />;
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return isFarsi ? 'رایگان' : 'Free';
    return isFarsi ? `${price.toLocaleString('fa-IR')} تومان` : `${price.toLocaleString()} Toman`;
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const usagePercent = currentTier ? Math.min(100, ((usage?.total_count || 0) / currentTier.monthly_limit) * 100) : 0;

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{isFarsi ? 'اشتراک‌ها' : 'Subscriptions'}</h1>
          <p className="text-muted-foreground">
            {isFarsi ? 'پلن مناسب خود را انتخاب کنید' : 'Choose the right plan for you'}
          </p>
        </div>

        {/* Current Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTierIcon(currentTier?.name || 'free')}
              {isFarsi ? 'وضعیت فعلی شما' : 'Your current status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>{isFarsi ? 'پلن فعلی:' : 'Current plan:'}</span>
              <Badge variant="secondary">{currentTier?.display_name_fa || 'رایگان'}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isFarsi ? 'استفاده این ماه:' : 'This month usage:'}</span>
                <span>{usage?.total_count || 0} / {currentTier?.monthly_limit || 5}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 80 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promo Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {isFarsi ? 'کد تخفیف' : 'Promo Code'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={isFarsi ? 'کد تخفیف خود را وارد کنید' : 'Enter promo code'}
                className="flex-1"
              />
              <Button 
                onClick={() => tiers[1] && validatePromoCode(tiers[1].id)}
                disabled={validatingPromo || !promoCode.trim()}
              >
                {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFarsi ? 'بررسی' : 'Apply')}
              </Button>
            </div>
            {promoApplied?.valid && (
              <p className="text-sm text-success mt-2">
                ✓ {promoApplied.messageFa || promoApplied.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tier Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = currentTier?.id === tier.id;
            const isUpgrade = (currentTier?.price_toman || 0) < tier.price_toman;
            
            return (
              <Card 
                key={tier.id} 
                className={`relative ${tier.name === 'pro' ? 'border-primary shadow-lg' : ''}`}
              >
                {tier.name === 'pro' && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    {isFarsi ? 'پیشنهادی' : 'Recommended'}
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 text-primary w-fit">
                    {getTierIcon(tier.name)}
                  </div>
                  <CardTitle>{tier.display_name_fa}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground">
                    {formatPrice(tier.price_toman)}
                    {tier.price_toman > 0 && <span className="text-sm font-normal text-muted-foreground">/{isFarsi ? 'ماه' : 'mo'}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      {tier.monthly_limit} {isFarsi ? 'درخواست AI در ماه' : 'AI requests/month'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      +{tier.grace_buffer} {isFarsi ? 'درخواست اضافی' : 'grace requests'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      {isFarsi ? 'چت‌بات هوشمند' : 'AI Chatbot'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      {isFarsi ? 'تحلیل مدارک پزشکی' : 'Medical doc analysis'}
                    </li>
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : tier.name === 'pro' ? 'default' : 'secondary'}
                    disabled={isCurrent || processingPayment || tier.price_toman === 0}
                    onClick={() => handleUpgrade(tier)}
                  >
                    {processingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      isFarsi ? 'پلن فعلی' : 'Current'
                    ) : isUpgrade ? (
                      <>
                        {isFarsi ? 'ارتقا' : 'Upgrade'}
                        <ArrowRight className="h-4 w-4 ms-2" />
                      </>
                    ) : (
                      isFarsi ? 'انتخاب' : 'Select'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isFarsi 
            ? '* درگاه پرداخت زرین‌پال - پشتیبانی از همه کارت‌های بانکی ایران'
            : '* ZarinPal payment gateway - supports all Iranian bank cards'}
        </p>
      </div>
    </AppLayout>
  );
};

export default Subscription;
