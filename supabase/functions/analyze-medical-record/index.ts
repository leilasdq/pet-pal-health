import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { record_title, record_category, record_notes, pet_name, pet_type, language } = await req.json();

    console.log('Analyzing medical record:', { record_title, record_category, pet_name, language });

    const isFarsi = language === 'fa';

    // Build context about the record
    let recordContext = '';
    if (record_title) recordContext += `Title: ${record_title}\n`;
    if (record_category) {
      const categoryMap: Record<string, string> = {
        medical_test: 'Medical Test / Blood Work',
        prescription: 'Prescription',
        passport: 'Pet Passport/ID',
      };
      recordContext += `Type: ${categoryMap[record_category] || record_category}\n`;
    }
    if (record_notes) recordContext += `Notes: ${record_notes}\n`;
    if (pet_name) recordContext += `Pet Name: ${pet_name}\n`;
    if (pet_type) recordContext += `Pet Type: ${pet_type}\n`;

    const systemPrompt = isFarsi 
      ? `شما یک دستیار دامپزشکی هوشمند هستید که به تحلیل مدارک پزشکی حیوانات خانگی کمک می‌کنید.

⚠️ هشدار مهم: این تحلیل صرفاً جنبه آموزشی دارد و جایگزین مشاوره دامپزشک نیست!

وظیفه شما:
1. بر اساس اطلاعات مدرک (عنوان، نوع، یادداشت‌ها)، یک تحلیل کوتاه و مفید ارائه دهید
2. اگر آزمایش خون است، توضیح دهید معمولاً چه مواردی بررسی می‌شود
3. نکات مراقبتی مرتبط را پیشنهاد دهید
4. همیشه تأکید کنید که برای تفسیر دقیق باید به دامپزشک مراجعه کنند

فرمت پاسخ:
- کوتاه و خلاصه (حداکثر 150 کلمه)
- استفاده از ایموجی 🩺💉🐾
- زبان ساده و قابل فهم
- پایان با یادآوری مراجعه به دامپزشک`
      : `You are an intelligent veterinary assistant helping to analyze pet medical records.

⚠️ Important: This analysis is for educational purposes only and does NOT replace professional veterinary advice!

Your task:
1. Based on the record information (title, type, notes), provide a brief and helpful analysis
2. If it's a blood test, explain what is typically checked
3. Suggest relevant care tips
4. Always emphasize they should consult a vet for accurate interpretation

Response format:
- Short and concise (max 150 words)
- Use emojis 🩺💉🐾
- Simple and understandable language
- End with a reminder to consult a vet`;

    const userMessage = isFarsi
      ? `لطفاً این مدرک پزشکی را تحلیل کنید:\n\n${recordContext}`
      : `Please analyze this medical record:\n\n${recordContext}`;

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
          { role: 'user', content: userMessage },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded', 
            analysis: isFarsi 
              ? 'متأسفانه درخواست‌های زیادی ارسال شده. لطفاً کمی صبر کنید.' 
              : 'Too many requests. Please wait a moment.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment required', 
            analysis: isFarsi 
              ? 'سرویس AI موقتاً در دسترس نیست.' 
              : 'AI service temporarily unavailable.' 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || (isFarsi 
      ? 'متأسفم، نتوانستم تحلیل کنم. لطفاً دوباره امتحان کنید.' 
      : 'Sorry, I couldn\'t analyze this. Please try again.');

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-medical-record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        analysis: 'خطایی رخ داد. لطفاً دوباره امتحان کنید. 🙏'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
