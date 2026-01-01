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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { usage_type } = await req.json(); // 'chatbot' or 'analysis'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header using anon key first
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    console.log(`Tracking ${usage_type} usage for user ${userId} in month ${currentMonth}`);

    // Check if usage record exists for this month
    const { data: existingUsage, error: fetchError } = await supabaseClient
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching usage:', fetchError);
      throw fetchError;
    }

    if (existingUsage) {
      // Update existing record
      const updateData: Record<string, number> = {
        total_count: existingUsage.total_count + 1,
      };
      
      if (usage_type === 'chatbot') {
        updateData.chatbot_count = existingUsage.chatbot_count + 1;
      } else if (usage_type === 'analysis') {
        updateData.analysis_count = existingUsage.analysis_count + 1;
      }

      const { error: updateError } = await supabaseClient
        .from('ai_usage')
        .update(updateData)
        .eq('id', existingUsage.id);

      if (updateError) {
        console.error('Error updating usage:', updateError);
        throw updateError;
      }

      console.log(`Updated usage: ${JSON.stringify(updateData)}`);
    } else {
      // Create new record
      const insertData = {
        user_id: userId,
        month_year: currentMonth,
        chatbot_count: usage_type === 'chatbot' ? 1 : 0,
        analysis_count: usage_type === 'analysis' ? 1 : 0,
        total_count: 1,
      };

      const { error: insertError } = await supabaseClient
        .from('ai_usage')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting usage:', insertError);
        throw insertError;
      }

      console.log(`Created new usage record: ${JSON.stringify(insertData)}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in track-ai-usage:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
