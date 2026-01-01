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
        JSON.stringify({ error: 'Unauthorized', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', allowed: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    console.log(`Checking usage for user ${userId} in month ${currentMonth}`);

    // Get user's current tier
    const { data: tierData, error: tierError } = await supabase
      .rpc('get_user_tier', { p_user_id: userId });

    if (tierError) {
      console.error('Error getting user tier:', tierError);
      // Default to free tier if error
    }

    const tier = tierData?.[0] || { tier_name: 'free', monthly_limit: 5, grace_buffer: 2 };
    const monthlyLimit = tier.monthly_limit;
    const graceBuffer = tier.grace_buffer;
    const totalLimit = monthlyLimit + graceBuffer;

    console.log(`User tier: ${tier.tier_name}, limit: ${monthlyLimit}, grace: ${graceBuffer}`);

    // Get user's current usage
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_user_usage', { p_user_id: userId });

    if (usageError) {
      console.error('Error getting user usage:', usageError);
    }

    const usage = usageData?.[0] || { total_count: 0, chatbot_count: 0, analysis_count: 0 };
    const currentUsage = usage.total_count;

    console.log(`Current usage: ${currentUsage}/${monthlyLimit} (grace: ${graceBuffer})`);

    const remaining = Math.max(0, monthlyLimit - currentUsage);
    const isGrace = currentUsage >= monthlyLimit && currentUsage < totalLimit;
    const isBlocked = currentUsage >= totalLimit;

    let message = '';
    let messageFa = '';

    if (isBlocked) {
      message = 'You have exceeded your monthly limit. Please upgrade your plan.';
      messageFa = 'شما از سقف ماهانه خود فراتر رفته‌اید. لطفاً اشتراک خود را ارتقا دهید.';
    } else if (isGrace) {
      const graceRemaining = totalLimit - currentUsage;
      message = `You have exceeded your regular limit. ${graceRemaining} grace requests remaining.`;
      messageFa = `شما از سقف عادی فراتر رفته‌اید. ${graceRemaining} درخواست اضافی باقی مانده.`;
    } else if (remaining <= 3) {
      message = `Only ${remaining} requests remaining this month.`;
      messageFa = `فقط ${remaining} درخواست در این ماه باقی مانده.`;
    }

    return new Response(
      JSON.stringify({
        allowed: !isBlocked,
        remaining,
        isGrace,
        isBlocked,
        currentUsage,
        monthlyLimit,
        graceBuffer,
        tierName: tier.tier_name,
        message,
        messageFa,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-ai-usage:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        allowed: true, // Allow on error to not block users
        remaining: 0,
        isGrace: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
