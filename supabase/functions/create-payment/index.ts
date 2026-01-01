import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ZarinPal sandbox URLs (change to production when ready)
const ZARINPAL_REQUEST_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json';
const ZARINPAL_STARTPAY_URL = 'https://sandbox.zarinpal.com/pg/StartPay/';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', errorFa: 'ابتدا وارد شوید' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tier_id, promo_code_id, callback_url } = await req.json();

    if (!tier_id) {
      return new Response(
        JSON.stringify({ error: 'No tier selected', errorFa: 'اشتراکی انتخاب نشده' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', errorFa: 'ابتدا وارد شوید' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    console.log(`Creating payment for user ${userId}, tier ${tier_id}`);

    // Get tier info
    const { data: tier, error: tierError } = await supabaseClient
      .from('subscription_tiers')
      .select('*')
      .eq('id', tier_id)
      .single();

    if (tierError || !tier) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier', errorFa: 'اشتراک نامعتبر' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let originalAmount = tier.price_toman;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let promoCode = null;

    // Apply promo code if provided
    if (promo_code_id) {
      const { data: promo } = await supabaseClient
        .from('promo_codes')
        .select('*')
        .eq('id', promo_code_id)
        .single();

      if (promo) {
        promoCode = promo;
        
        if (promo.discount_type === 'percentage') {
          discountAmount = Math.floor((originalAmount * promo.discount_value) / 100);
        } else if (promo.discount_type === 'fixed_amount') {
          discountAmount = Math.min(promo.discount_value, originalAmount);
        } else if (promo.discount_type === 'free_tier') {
          // Free tier - amount is 0
          discountAmount = originalAmount;
        }
        
        finalAmount = Math.max(0, originalAmount - discountAmount);
      }
    }

    console.log(`Amount: ${originalAmount}, Discount: ${discountAmount}, Final: ${finalAmount}`);

    // If final amount is 0 (free via promo), activate subscription directly
    if (finalAmount === 0) {
      // Create payment record as completed
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          user_id: userId,
          tier_id: tier_id,
          original_amount: originalAmount,
          discount_amount: discountAmount,
          final_amount: 0,
          gateway: 'promo',
          status: 'completed',
          promo_code_id: promo_code_id,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        throw paymentError;
      }

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          tier_id: tier_id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          promo_code_id: promo_code_id,
        });

      // Record promo usage
      if (promo_code_id) {
        await supabaseClient
          .from('promo_code_usage')
          .insert({
            promo_code_id: promo_code_id,
            user_id: userId,
            payment_id: payment.id,
          });

        // Increment promo used_count
        await supabaseClient
          .from('promo_codes')
          .update({ used_count: (promoCode?.used_count || 0) + 1 })
          .eq('id', promo_code_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          free: true,
          message: 'Subscription activated with promo code',
          messageFa: 'اشتراک با کد تخفیف فعال شد',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: userId,
        tier_id: tier_id,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        gateway: 'zarinpal',
        status: 'pending',
        promo_code_id: promo_code_id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      throw paymentError;
    }

    // Get ZarinPal merchant ID from secrets
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    
    if (!merchantId) {
      // If no merchant ID, return demo mode response
      console.log('No ZarinPal merchant ID configured - returning demo mode');
      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          paymentId: payment.id,
          amount: finalAmount,
          message: 'Demo mode - ZarinPal not configured',
          messageFa: 'حالت آزمایشی - درگاه پرداخت تنظیم نشده',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call ZarinPal API
    const zarinpalResponse = await fetch(ZARINPAL_REQUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: finalAmount * 10, // Convert Toman to Rial
        callback_url: callback_url || `${supabaseUrl}/functions/v1/verify-payment`,
        description: `خرید اشتراک ${tier.display_name_fa}`,
        metadata: {
          payment_id: payment.id,
          user_id: userId,
        },
      }),
    });

    const zarinpalData = await zarinpalResponse.json();

    if (zarinpalData.data?.code !== 100) {
      console.error('ZarinPal error:', zarinpalData);
      return new Response(
        JSON.stringify({
          error: 'Payment gateway error',
          errorFa: 'خطا در اتصال به درگاه پرداخت',
          details: zarinpalData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authority = zarinpalData.data.authority;

    // Update payment with authority
    await supabaseClient
      .from('payments')
      .update({ authority })
      .eq('id', payment.id);

    const paymentUrl = `${ZARINPAL_STARTPAY_URL}${authority}`;

    console.log(`Payment URL created: ${paymentUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl,
        authority,
        paymentId: payment.id,
        amount: finalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorFa: 'خطا در ایجاد پرداخت',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
