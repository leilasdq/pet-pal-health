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
    const { record_title, record_category, record_notes, pet_name, pet_type, language, image_url } = await req.json();

    console.log('Analyzing medical record:', { record_title, record_category, pet_name, language, hasImage: !!image_url });

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
      ? `شما یک دستیار دامپزشکی هوشمند هستید. وظیفه شما تحلیل دقیق مدارک پزشکی حیوانات خانگی است.

دستورالعمل‌های تحلیل:

برای آزمایش خون یا آزمایشات:
- تمام مقادیر را از تصویر بخوانید
- برای هر مقدار بنویسید: نام آزمایش | مقدار | واحد | وضعیت
- وضعیت‌ها: 🔴 بالا | 🔵 پایین | ✅ نرمال
- برای مقادیر غیرنرمال توضیح کوتاه بدهید

برای نسخه دارو:
- لیست داروها با دوز و دستور مصرف
- هشدارهای مهم

برای پاسپورت/شناسنامه:
- واکسیناسیون‌ها با تاریخ
- تاریخ‌های مهم آینده

مهم: مستقیماً تحلیل را بنویسید. جمله مقدماتی ننویسید. فقط نتایج.

⚠️ در انتها یادآوری کنید: برای تفسیر دقیق به دامپزشک مراجعه کنید.`
      : `You are an intelligent veterinary assistant. Your task is to accurately analyze pet medical documents.

Analysis instructions:

For blood tests or lab work:
- Read ALL values from the image
- For each value write: Test Name | Value | Unit | Status
- Status: 🔴 High | 🔵 Low | ✅ Normal
- Provide brief explanation for abnormal values

For prescriptions:
- List medications with dosage and instructions
- Important warnings

For passport/ID:
- Vaccinations with dates
- Important future dates

Important: Write the analysis directly. No introductory sentences. Just results.

⚠️ End with reminder: Consult a vet for accurate interpretation.`;

    // Build messages with image if available
    const userContent: any[] = [];
    
    if (image_url) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: image_url
        }
      });
    }
    
    const textPrompt = isFarsi
      ? `این مدرک پزشکی را تحلیل کن. تمام مقادیر را بخوان و وضعیت هر کدام را مشخص کن:\n\n${recordContext}`
      : `Analyze this medical document. Read all values and indicate the status of each:\n\n${recordContext}`;
    
    userContent.push({
      type: "text",
      text: textPrompt
    });

    console.log('Sending request to Lovable AI Gateway with vision...');

    // Use gemini-2.5-pro for better vision analysis with higher token limit
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 2048, // Increased for complete analysis
        temperature: 0.2, // Lower temperature for more accurate reading
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
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
    console.log('AI Response received, choices:', data.choices?.length);
    
    const analysis = data.choices?.[0]?.message?.content;
    console.log('Analysis length:', analysis?.length || 0);

    if (!analysis || analysis.length < 50) {
      console.error('Analysis too short or empty:', analysis);
      return new Response(
        JSON.stringify({ 
          analysis: isFarsi 
            ? 'متأسفم، تصویر به درستی خوانده نشد. لطفاً مطمئن شوید تصویر واضح است و دوباره امتحان کنید.' 
            : 'Sorry, the image could not be read properly. Please ensure the image is clear and try again.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
