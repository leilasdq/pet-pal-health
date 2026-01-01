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
    const isPassport = record_category === 'passport';
    const isPrescription = record_category === 'prescription';
    const useToolCalling = isPassport || isPrescription;
    
    // Get current date in both formats for context
    const now = new Date();
    const gregorianDate = now.toISOString().split('T')[0];
    // Approximate Jalali date (rough conversion: Jalali year = Gregorian year - 621 or 622)
    const jalaliYear = now.getMonth() < 2 ? now.getFullYear() - 622 : now.getFullYear() - 621;
    const jalaliMonth = ((now.getMonth() + 10) % 12) + 1; // Rough approximation
    const jalaliDay = now.getDate();
    const jalaliDate = `${jalaliYear}/${String(jalaliMonth).padStart(2, '0')}/${String(jalaliDay).padStart(2, '0')}`;

    let systemPrompt: string;
    let textPrompt: string;
    let toolName: string = '';

    if (isPassport) {
      toolName = 'analyze_passport';
      systemPrompt = isFarsi 
        ? `تحلیلگر دفترچه واکسن و شناسنامه حیوانات.

تاریخ امروز: ${jalaliDate} شمسی (${gregorianDate} میلادی)

نکات مهم برای خواندن تاریخ:
- تاریخ‌های ایرانی معمولاً به صورت ۱۴۰۳/۰۵/۲۰ یا ۱۴۰۳-۰۵-۲۰ نوشته می‌شوند
- اگر سال با ۱۴ شروع شود، تاریخ شمسی است
- اگر سال با ۲۰ شروع شود، تاریخ میلادی است
- اعداد فارسی: ۰۱۲۳۴۵۶۷۸۹
- دقت کن ارقام را درست بخوانی، مخصوصاً ۲ و ۳ یا ۵ و ۶

قوانین:
1. تاریخ آخرین واکسن یا ضدانگل را پیدا کن و دقیقاً بنویس
2. با توجه به تاریخ امروز، بگو چه مدت گذشته
3. آیا نیاز به تمدید دارد؟
4. یک توصیه کوتاه بده
5. حداکثر ۸۰ کلمه

مثال:
**آخرین واکسن:** ۱۴۰۳/۰۹/۱۵ (۳ ماه پیش)
**ضدانگل:** ۱۴۰۳/۱۰/۰۱ (۲ ماه پیش)
**توصیه:** واکسن سالانه در ۳ ماه آینده باید تمدید شود.`
        : `Pet vaccination passport analyzer.

Today's date: ${gregorianDate} (Jalali: ${jalaliDate})

Date reading tips:
- Persian dates are usually in format 1403/05/20 or 1403-05-20
- Years starting with 14xx are Jalali/Persian dates
- Years starting with 20xx are Gregorian dates
- Persian numerals: ۰۱۲۳۴۵۶۷۸۹

Rules:
1. Find dates of last vaccines or deworming - write them exactly
2. Based on today's date, calculate how long ago
3. Say if renewal is needed
4. One short advice
5. Maximum 80 words`;

      textPrompt = isFarsi
        ? `تاریخ امروز ${jalaliDate} است. تاریخ‌های واکسن و ضدانگل را دقیقاً از تصویر بخوان و توصیه بده. اگر نیاز به یادآوری هست، بگو.`
        : `Today is ${gregorianDate}. Read vaccine/deworming dates exactly from the image and give advice. If a reminder is needed, mention it.`;
    } else if (isPrescription) {
      toolName = 'analyze_prescription';
      systemPrompt = isFarsi 
        ? `تحلیلگر نسخه دارویی حیوانات خانگی.

قوانین:
1. نام داروها، دوز و مدت مصرف را پیدا کن
2. تاریخ شروع/پایان دارو را اگر هست بنویس
3. بگو چه زمانی دارو تمام می‌شود و نیاز به تهیه مجدد دارد
4. یک توصیه کوتاه بده
5. حداکثر ۱۰۰ کلمه

مثال:
**داروها:**
• آموکسی‌سیلین ۵۰۰mg - روزی ۲ بار - ۷ روز
**پایان دوره:** ۱۴۰۳/۱۰/۲۰
**توصیه:** ۲ روز دیگر دارو تمام می‌شود. اگر علائم ادامه دارد، به دامپزشک مراجعه کنید.`
        : `Pet prescription analyzer.

Rules:
1. Find medication names, dosages, and duration
2. Note start/end dates if present
3. Say when medication will run out and if refill needed
4. One short advice
5. Maximum 100 words`;

      textPrompt = isFarsi
        ? `داروها، دوز و مدت مصرف را پیدا کن. اگر نیاز به تهیه مجدد یا یادآوری هست، بگو.`
        : `Find medications, dosages, and duration. If a refill reminder is needed, mention it.`;
    } else {
      systemPrompt = isFarsi 
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

**خلاصه:** هموگلوبین بالا ممکن است نشانه کم‌آبی باشد.`
        : `Concise pet medical document analyzer.

Rules:
1. List ONLY abnormal values
2. For each: Name | Value | 🔴High or 🔵Low
3. One short summary sentence at the end
4. Maximum 100 words`;

      textPrompt = isFarsi
        ? `فقط مقادیر غیرنرمال را لیست کن. مختصر باش.`
        : `List only abnormal values. Be concise.`;
    }

    const userContent: any[] = [];
    
    if (image_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: image_url }
      });
    }
    
    userContent.push({ type: "text", text: textPrompt });

    // Define tools for extracting structured reminder data
    let tools: any[] | undefined;

    if (isPassport) {
      tools = [
        {
          type: "function",
          function: {
            name: "analyze_passport",
            description: "Analyze pet passport and extract vaccination/deworming information with reminder suggestions",
            parameters: {
              type: "object",
              properties: {
                analysis_text: {
                  type: "string",
                  description: "The analysis text to show to user (max 80 words)"
                },
                reminder_suggestion: {
                  type: "object",
                  properties: {
                    needed: {
                      type: "boolean",
                      description: "Whether a reminder should be suggested"
                    },
                    type: {
                      type: "string",
                      enum: ["vaccine", "deworming", "checkup"],
                      description: "Type of reminder"
                    },
                    title: {
                      type: "string",
                      description: "Suggested title for the reminder"
                    },
                    days_until_due: {
                      type: "number",
                      description: "Approximate days until this is due (0 if overdue, positive if upcoming)"
                    }
                  },
                  required: ["needed"]
                }
              },
              required: ["analysis_text", "reminder_suggestion"]
            }
          }
        }
      ];
    } else if (isPrescription) {
      tools = [
        {
          type: "function",
          function: {
            name: "analyze_prescription",
            description: "Analyze pet prescription and extract medication schedule with refill reminder suggestions",
            parameters: {
              type: "object",
              properties: {
                analysis_text: {
                  type: "string",
                  description: "The analysis text to show to user (max 100 words)"
                },
                reminder_suggestion: {
                  type: "object",
                  properties: {
                    needed: {
                      type: "boolean",
                      description: "Whether a medication refill reminder should be suggested"
                    },
                    type: {
                      type: "string",
                      enum: ["medication"],
                      description: "Type of reminder (always medication for prescriptions)"
                    },
                    title: {
                      type: "string",
                      description: "Suggested title for the reminder (e.g., 'Refill Amoxicillin' or 'تهیه مجدد آموکسی‌سیلین')"
                    },
                    days_until_due: {
                      type: "number",
                      description: "Days until medication runs out (0 if already out, positive if still have supply)"
                    }
                  },
                  required: ["needed"]
                }
              },
              required: ["analysis_text", "reminder_suggestion"]
            }
          }
        }
      ];
    }

    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.1,
    };

    if (tools && toolName) {
      requestBody.tools = tools;
      requestBody.tool_choice = { type: "function", function: { name: toolName } };
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    console.log('AI Response:', JSON.stringify(data, null, 2));
    
    let analysis: string;
    let reminderSuggestion: any = null;

    // Check if response used tool calling
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && (toolCall.function?.name === 'analyze_passport' || toolCall.function?.name === 'analyze_prescription')) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        analysis = args.analysis_text;
        reminderSuggestion = args.reminder_suggestion;
        console.log('Parsed tool response:', { analysis: analysis?.length, reminderSuggestion });
      } catch (e) {
        console.error('Failed to parse tool response:', e);
        analysis = data.choices?.[0]?.message?.content || '';
      }
    } else {
      analysis = data.choices?.[0]?.message?.content || '';
    }

    if (!analysis) {
      return new Response(
        JSON.stringify({ analysis: isFarsi ? 'تصویر خوانا نبود.' : 'Image not readable.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis completed, length:', analysis.length);

    const responseData: any = { analysis };
    if (reminderSuggestion?.needed) {
      responseData.reminderSuggestion = reminderSuggestion;
    }

    return new Response(
      JSON.stringify(responseData),
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
