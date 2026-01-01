import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Unauthorized', errorFa: 'ابتدا وارد شوید' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, tier_id } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No code provided', errorFa: 'کد تخفیف وارد نشده' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Unauthorized', errorFa: 'ابتدا وارد شوید' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const normalizedCode = code.toUpperCase().trim();

    console.log(`Validating promo code ${normalizedCode} for user ${userId}`);

    // Get promo code
    const { data: promoCode, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (promoError) {
      console.error('Error fetching promo code:', promoError);
      throw promoError;
    }

    if (!promoCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid code', errorFa: 'کد تخفیف نامعتبر است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Code expired', errorFa: 'کد تخفیف منقضی شده است' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Code not yet active', errorFa: 'کد تخفیف هنوز فعال نشده' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (promoCode.max_uses && promoCode.used_count >= promoCode.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Code usage limit reached', errorFa: 'ظرفیت استفاده از این کد تمام شده' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already used this code
    const { data: existingUsage, error: usageError } = await supabase
      .from('promo_code_usage')
      .select('id')
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (usageError) {
      console.error('Error checking promo usage:', usageError);
    }

    if (existingUsage) {
      return new Response(
        JSON.stringify({ valid: false, error: 'You already used this code', errorFa: 'شما قبلاً از این کد استفاده کرده‌اید' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tier info for free_tier type
    let freeTierInfo = null;
    if (promoCode.discount_type === 'free_tier' && promoCode.free_tier_id) {
      const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', promoCode.free_tier_id)
        .single();
      freeTierInfo = tier;
    }

    // Calculate discount based on tier_id if provided
    let discountAmount = 0;
    let finalAmount = 0;

    if (tier_id && promoCode.discount_type !== 'free_tier') {
      const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('price_toman')
        .eq('id', tier_id)
        .single();

      if (tier) {
        const originalPrice = tier.price_toman;
        if (promoCode.discount_type === 'percentage') {
          discountAmount = Math.floor((originalPrice * promoCode.discount_value) / 100);
        } else if (promoCode.discount_type === 'fixed_amount') {
          discountAmount = Math.min(promoCode.discount_value, originalPrice);
        }
        finalAmount = Math.max(0, originalPrice - discountAmount);
      }
    }

    console.log(`Promo code ${normalizedCode} is valid. Type: ${promoCode.discount_type}, Value: ${promoCode.discount_value}`);

    return new Response(
      JSON.stringify({
        valid: true,
        promoCodeId: promoCode.id,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value,
        discountAmount,
        finalAmount,
        freeTierInfo,
        durationMonths: promoCode.duration_months || 1,
        message: 'Code applied successfully',
        messageFa: 'کد تخفیف با موفقیت اعمال شد',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-promo-code:', error);
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorFa: 'خطا در بررسی کد تخفیف',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
