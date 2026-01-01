import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ZarinPal verification URL
const ZARINPAL_VERIFY_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json';

serve(async (req) => {
  // Handle both GET (redirect from ZarinPal) and POST (manual verification)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let authority: string | null = null;
    let status: string | null = null;

    // Parse parameters from URL or body
    if (req.method === 'GET') {
      const url = new URL(req.url);
      authority = url.searchParams.get('Authority');
      status = url.searchParams.get('Status');
    } else {
      const body = await req.json();
      authority = body.authority;
      status = body.status || 'OK';
    }

    if (!authority) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authority provided', errorFa: 'کد پیگیری یافت نشد' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying payment with authority: ${authority}, status: ${status}`);

    // Find payment by authority
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, subscription_tiers(*)')
      .eq('authority', authority)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found', errorFa: 'پرداخت یافت نشد' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (payment.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyProcessed: true,
          message: 'Payment already verified',
          messageFa: 'پرداخت قبلاً تأیید شده است',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check ZarinPal status
    if (status !== 'OK') {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment cancelled',
          errorFa: 'پرداخت توسط کاربر لغو شد',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with ZarinPal
    const merchantId = Deno.env.get('ZARINPAL_MERCHANT_ID');
    
    if (!merchantId) {
      // Demo mode - auto-approve
      console.log('Demo mode - auto-approving payment');
      
      await supabase
        .from('payments')
        .update({ status: 'completed', transaction_id: 'DEMO-' + Date.now() })
        .eq('id', payment.id);

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabase
        .from('user_subscriptions')
        .insert({
          user_id: payment.user_id,
          tier_id: payment.tier_id,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          promo_code_id: payment.promo_code_id,
        });

      // Record promo usage if applicable
      if (payment.promo_code_id) {
        await supabase
          .from('promo_code_usage')
          .insert({
            promo_code_id: payment.promo_code_id,
            user_id: payment.user_id,
            payment_id: payment.id,
          });

        // Increment used_count
        const { data: promo } = await supabase
          .from('promo_codes')
          .select('used_count')
          .eq('id', payment.promo_code_id)
          .single();

        if (promo) {
          await supabase
            .from('promo_codes')
            .update({ used_count: promo.used_count + 1 })
            .eq('id', payment.promo_code_id);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          demo: true,
          message: 'Demo payment verified',
          messageFa: 'پرداخت آزمایشی تأیید شد',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real ZarinPal verification
    const verifyResponse = await fetch(ZARINPAL_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: payment.final_amount * 10, // Rial
        authority: authority,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (verifyData.data?.code !== 100 && verifyData.data?.code !== 101) {
      console.error('ZarinPal verification failed:', verifyData);
      
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment verification failed',
          errorFa: 'تأیید پرداخت ناموفق بود',
          details: verifyData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refId = verifyData.data.ref_id;

    console.log(`Payment verified successfully. RefID: ${refId}`);

    // Update payment as completed
    await supabase
      .from('payments')
      .update({ status: 'completed', transaction_id: refId.toString() })
      .eq('id', payment.id);

    // Create subscription
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase
      .from('user_subscriptions')
      .insert({
        user_id: payment.user_id,
        tier_id: payment.tier_id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        promo_code_id: payment.promo_code_id,
      });

    // Record promo usage if applicable
    if (payment.promo_code_id) {
      await supabase
        .from('promo_code_usage')
        .insert({
          promo_code_id: payment.promo_code_id,
          user_id: payment.user_id,
          payment_id: payment.id,
        });

      const { data: promo } = await supabase
        .from('promo_codes')
        .select('used_count')
        .eq('id', payment.promo_code_id)
        .single();

      if (promo) {
        await supabase
          .from('promo_codes')
          .update({ used_count: promo.used_count + 1 })
          .eq('id', payment.promo_code_id);
      }
    }

    // Redirect to success page
    if (req.method === 'GET') {
      const redirectUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/payment-success?ref=${refId}`;
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        refId,
        message: 'Payment verified successfully',
        messageFa: 'پرداخت با موفقیت تأیید شد',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorFa: 'خطا در تأیید پرداخت',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
