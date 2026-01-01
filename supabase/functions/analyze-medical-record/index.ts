import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record_title, record_category, record_notes, pet_name, pet_type, language, image_url } = await req.json();

    console.log('Analyzing medical record:', { record_title, record_category, pet_name, language, hasImage: !!image_url });

    const isFarsi = language === 'fa';

    const systemPrompt = isFarsi 
      ? `تحلیلگر مختصر مدارک پزشکی حیوانات.

قوانین:
1. فقط مقادیر غیرنرمال را بنویس
2. برای هر مورد غیرنرمال: نام | مقدار | 🔴بالا یا 🔵پایین
3. یک جمله کوتاه در آخر بگو چه چیزی مهم است
4. حداکثر ۱۰۰ کلمه

مثال خروجی:
**مقادیر غیرنرمال:**
• HGB: 17.5 g/dL 🔴بالا
• HCT: 56% 🔴بالا
• MCHC: 31.3 g/dL 🔵پایین

**خلاصه:** هموگلوبین و هماتوکریت بالا ممکن است نشانه کم‌آبی باشد. مراجعه به دامپزشک توصیه می‌شود.`
      : `Concise pet medical document analyzer.

Rules:
1. List ONLY abnormal values
2. For each: Name | Value | 🔴High or 🔵Low
3. One short summary sentence at the end
4. Maximum 100 words

Example output:
**Abnormal Values:**
• HGB: 17.5 g/dL 🔴High
• HCT: 56% 🔴High
• MCHC: 31.3 g/dL 🔵Low

**Summary:** Elevated hemoglobin and hematocrit may indicate dehydration. Consult your vet.`;

    const userContent: any[] = [];
    
    if (image_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: image_url }
      });
    }
    
    const textPrompt = isFarsi
      ? `فقط مقادیر غیرنرمال را لیست کن. مختصر باش.`
      : `List only abnormal values. Be concise.`;
    
    userContent.push({ type: "text", text: textPrompt });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', analysis: isFarsi ? 'لطفاً کمی صبر کنید.' : 'Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', analysis: isFarsi ? 'سرویس موقتاً در دسترس نیست.' : 'Service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return new Response(
        JSON.stringify({ analysis: isFarsi ? 'تصویر خوانا نبود.' : 'Image not readable.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis completed, length:', analysis.length);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', analysis: 'خطا رخ داد.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
