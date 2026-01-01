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
      ? `شما یک دستیار دامپزشکی هوشمند هستید که به تحلیل مدارک پزشکی حیوانات خانگی کمک می‌کنید.

⚠️ هشدار مهم: این تحلیل صرفاً جنبه آموزشی دارد و جایگزین مشاوره دامپزشک نیست!

وظیفه شما:
1. تصویر مدرک پزشکی را با دقت بررسی کنید
2. اگر آزمایش خون یا آزمایش دیگری است:
   - مقادیر را بخوانید و شناسایی کنید
   - مقادیری که بالاتر از حد نرمال هستند را با 🔴 مشخص کنید
   - مقادیری که پایین‌تر از حد نرمال هستند را با 🔵 مشخص کنید
   - مقادیر نرمال را با ✅ نشان دهید
   - توضیح دهید هر مقدار غیرنرمال چه معنایی می‌تواند داشته باشد
3. اگر نسخه دارو است، داروها را لیست کنید و نکات مهم مصرف را بگویید
4. اگر پاسپورت/شناسنامه است، اطلاعات مهم مثل واکسیناسیون‌ها را خلاصه کنید

فرمت پاسخ:
- ساختارمند و خوانا
- استفاده از ایموجی برای وضوح
- اگر متن تصویر خوانا نیست، صادقانه بگویید
- پایان با یادآوری مراجعه به دامپزشک برای تفسیر دقیق`
      : `You are an intelligent veterinary assistant helping to analyze pet medical records.

⚠️ Important: This analysis is for educational purposes only and does NOT replace professional veterinary advice!

Your task:
1. Carefully examine the medical document image
2. If it's a blood test or lab work:
   - Read and identify the values
   - Mark values ABOVE normal range with 🔴
   - Mark values BELOW normal range with 🔵
   - Mark normal values with ✅
   - Explain what each abnormal value could mean
3. If it's a prescription, list the medications and important usage notes
4. If it's a passport/ID, summarize important info like vaccinations

Response format:
- Structured and readable
- Use emojis for clarity
- If the text in the image is not readable, honestly say so
- End with a reminder to consult a vet for accurate interpretation`;

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
      ? `لطفاً این مدرک پزشکی را با دقت تحلیل کنید. اگر آزمایش است، مقادیر را بخوانید و بگویید کدام‌ها نرمال، بالا یا پایین هستند:\n\n${recordContext}`
      : `Please carefully analyze this medical document. If it's a test, read the values and indicate which are normal, high, or low:\n\n${recordContext}`;
    
    userContent.push({
      type: "text",
      text: textPrompt
    });

    console.log('Sending request to Lovable AI Gateway with vision...');

    // Use gemini-2.5-pro for better vision analysis
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
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more accurate reading
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
