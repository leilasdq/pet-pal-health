import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Check usage limits if user is authenticated
    let usageInfo = null;
    if (authHeader) {
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseAnon.auth.getUser();
      
      if (user) {
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // Get user tier
        const { data: tierData } = await supabaseService.rpc('get_user_tier', { p_user_id: user.id });
        const tier = tierData?.[0] || { tier_name: 'free', monthly_limit: 5, grace_buffer: 2 };
        
        // Get current usage
        const { data: usageData } = await supabaseService.rpc('get_user_usage', { p_user_id: user.id });
        const usage = usageData?.[0] || { total_count: 0 };
        
        const totalLimit = tier.monthly_limit + tier.grace_buffer;
        const isBlocked = usage.total_count >= totalLimit;
        const isGrace = usage.total_count >= tier.monthly_limit && usage.total_count < totalLimit;
        const remaining = Math.max(0, tier.monthly_limit - usage.total_count);
        
        usageInfo = {
          remaining,
          isGrace,
          isBlocked,
          tierName: tier.tier_name,
          monthlyLimit: tier.monthly_limit,
          currentUsage: usage.total_count,
        };
        
        if (isBlocked) {
          console.log(`User ${user.id} blocked - usage: ${usage.total_count}/${totalLimit}`);
          return new Response(
            JSON.stringify({
              error: 'Usage limit exceeded',
              response: '⚠️ متأسفانه سقف استفاده ماهانه شما تمام شده است. برای ادامه استفاده از دستیار هوش مصنوعی، لطفاً اشتراک خود را ارتقا دهید.',
              usageInfo,
              blocked: true,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { user_message, pet_context, conversation_history } = await req.json();

    if (!user_message) {
      throw new Error('No message provided');
    }

    console.log('Received message:', user_message);
    console.log('Pet context:', pet_context);

    // Build system prompt - conversational and friendly, not Wikipedia-style
    let systemPrompt = `شما یک دستیار دامپزشکی دوستانه و مهربان هستید که به فارسی صحبت می‌کنید.

شخصیت شما:
- صمیمی و گرم باشید، مثل یک دوست که به حیوانات علاقه‌مند است
- از ایموجی استفاده کنید 🐱🐕❤️
- جواب‌های کوتاه و مفید بدهید، نه مثل دائرةالمعارف!
- با همدلی صحبت کنید - درک می‌کنید که صاحب حیوان نگران است

روش پاسخ‌دهی:
- هرگز تشخیص قطعی ندهید
- وقتی علامتی گفته شد، ۲-۳ سوال کوتاه بپرسید تا بهتر بفهمید
- بعد از جواب کاربر، راهنمایی عملی و ساده بدهید
- اگر اورژانسی به نظر رسید، با **متن پررنگ** بگویید فوراً به دامپزشک مراجعه کنند

مثال خوب:
"سلام! 🐕 چه اتفاقی افتاده برای [نام حیوان]؟ 
- از کی شروع شده؟
- اشتهاش چطوره؟
- انرژیش کم شده یا نه؟"

مثال بد (مثل ویکی‌پدیا):
"استفراغ در سگ‌ها می‌تواند ناشی از عوامل متعددی باشد از جمله عفونت‌های ویروسی، باکتریایی، انگلی، مسمومیت غذایی، بیماری‌های کبدی و کلیوی..."

یادتان باشد: شما جایگزین دامپزشک نیستید، فقط کمک اولیه می‌کنید! 💚`;

    if (pet_context) {
      systemPrompt += `\n\nاطلاعات حیوان خانگی:
- اسم: ${pet_context.name || 'نامشخص'}
- نژاد: ${pet_context.breed || 'نامشخص'}
- تاریخ تولد: ${pet_context.birth_date || 'نامشخص'}
- وزن: ${pet_context.weight ? `${pet_context.weight} کیلو` : 'نامشخص'}

از این اطلاعات برای شخصی‌سازی جواب‌ها استفاده کنید (مثلاً "خب ${pet_context.name} عزیز چه مشکلی داره؟")`;
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history for context
    if (conversation_history && Array.isArray(conversation_history)) {
      conversation_history.forEach((msg: { role: string; content: string }) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Add the current user message
    messages.push({ role: 'user', content: user_message });

    console.log('Sending request to Lovable AI Gateway...');

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', response: 'متأسفانه درخواست‌های زیادی ارسال شده. لطفاً کمی صبر کنید و دوباره امتحان کنید.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', response: 'سرویس AI موقتاً در دسترس نیست. لطفاً بعداً امتحان کنید.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'متأسفم، نتوانستم جواب بدم. لطفاً دوباره امتحان کن! 🙏';

    console.log('AI Response received successfully');

    // Track usage after successful response
    if (authHeader) {
      try {
        const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabaseAnon.auth.getUser();
        
        if (user) {
          const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          // Get or create usage record
          const { data: existingUsage } = await supabaseService
            .from('ai_usage')
            .select('*')
            .eq('user_id', user.id)
            .eq('month_year', currentMonth)
            .maybeSingle();
          
          if (existingUsage) {
            await supabaseService
              .from('ai_usage')
              .update({
                chatbot_count: existingUsage.chatbot_count + 1,
                total_count: existingUsage.total_count + 1,
              })
              .eq('id', existingUsage.id);
          } else {
            await supabaseService
              .from('ai_usage')
              .insert({
                user_id: user.id,
                month_year: currentMonth,
                chatbot_count: 1,
                analysis_count: 0,
                total_count: 1,
              });
          }
          
          // Update usageInfo for response
          if (usageInfo) {
            usageInfo.remaining = Math.max(0, usageInfo.remaining - 1);
            usageInfo.currentUsage += 1;
          }
        }
      } catch (trackError) {
        console.error('Error tracking usage:', trackError);
        // Don't fail the request if tracking fails
      }
    }

    // Add grace period warning to response
    let finalResponse = aiResponse;
    if (usageInfo?.isGrace) {
      finalResponse = `⚠️ توجه: شما از سقف عادی ماهانه فراتر رفته‌اید. ${usageInfo.remaining} درخواست اضافی باقی مانده.\n\n${aiResponse}`;
    }

    return new Response(
      JSON.stringify({ response: finalResponse, usageInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pet-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: 'اوه! یه مشکلی پیش اومد 😅 لطفاً دوباره امتحان کن.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});