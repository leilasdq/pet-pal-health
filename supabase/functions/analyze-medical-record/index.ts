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
        ? `تحلیلگر تخصصی نسخه دارویی دامپزشکی.

تاریخ امروز: ${jalaliDate} شمسی (${gregorianDate} میلادی)

## داروهای رایج دامپزشکی (فارسی/انگلیسی):
- آمیکاسین / Amikacin - آنتی‌بیوتیک تزریقی
- متوکلوپرامید / Metoclopramide - ضد تهوع
- رانیتیدین / Ranitidine - ضد اسید معده
- اندانسترون / Ondansetron - ضد استفراغ
- آموکسی‌سیلین / Amoxicillin - آنتی‌بیوتیک خوراکی
- سفالکسین / Cephalexin - آنتی‌بیوتیک
- پردنیزولون / Prednisolone - کورتون
- متروکسی‌کم / Meloxicam - ضد درد
- ترامادول / Tramadol - مسکن
- گاباپنتین / Gabapentin - ضد درد عصبی
- فاموتیدین / Famotidine - ضد اسید
- سوکرالفیت / Sucralfate - محافظ معده
- مارفلوکساسین / Marbofloxacin - آنتی‌بیوتیک
- فورازولیدون / Furazolidone - ضد عفونت روده

## مخففات رایج:
- Amp/آمپ = آمپول (تزریقی)
- Tab/قرص = قرص/تبلت
- Cap/کپ = کپسول
- Inj/تز = تزریق
- SC/زیرجلد = زیرجلدی
- IM/عضله = عضلانی
- IV/وریدی = داخل وریدی
- cc/سی‌سی = میلی‌لیتر
- mg/میلی = میلی‌گرم
- BID/دوبار = روزی ۲ بار
- TID/سه‌بار = روزی ۳ بار
- SID/یکبار = روزی ۱ بار
- PRN = در صورت نیاز

## راهنمای خواندن نسخه دست‌نویس:
1. دنبال شماره‌گذاری بگرد: ۱) ۲) ۳) یا 1. 2. 3. یا ① ② ③
2. فلش (←) معمولاً نشان‌دهنده دوز است
3. اعداد کسری: ½ یا 0.5 یا نصف | ¼ یا 0.25 یا یک‌چهارم
4. خط تیره (-) جدا کننده بخش‌های مختلف است
5. اگر خوانا نیست، بهترین حدس را بزن و [نامطمئن] بنویس

قوانین:
1. هر دارو را جدا بنویس با: نام | دوز | تعداد در روز | مدت | نحوه مصرف
2. سطح اطمینان: بالا/متوسط/پایین
3. پیشنهاد یادآوری برای تهیه مجدد
4. حداکثر ۱۵۰ کلمه`
        : `Veterinary prescription analyzer specialist.

Today's date: ${gregorianDate} (Jalali: ${jalaliDate})

## Common Veterinary Medications (English/Persian):
- Amikacin / آمیکاسین - Injectable antibiotic
- Metoclopramide / متوکلوپرامید - Anti-nausea
- Ranitidine / رانیتیدین - Antacid
- Ondansetron / اندانسترون - Anti-vomiting
- Amoxicillin / آموکسی‌سیلین - Oral antibiotic
- Cephalexin / سفالکسین - Antibiotic
- Prednisolone / پردنیزولون - Corticosteroid
- Meloxicam / متروکسی‌کم - Pain reliever
- Tramadol / ترامادول - Painkiller
- Gabapentin / گاباپنتین - Nerve pain
- Famotidine / فاموتیدین - Antacid
- Sucralfate / سوکرالفیت - Stomach protector
- Marbofloxacin / مارفلوکساسین - Antibiotic
- Furazolidone / فورازولیدون - Intestinal anti-infective

## Common Abbreviations:
- Amp = Ampule (injectable)
- Tab = Tablet
- Cap = Capsule
- Inj = Injection
- SC = Subcutaneous
- IM = Intramuscular
- IV = Intravenous
- cc/mL = Milliliter
- mg = Milligram
- BID = Twice daily
- TID = Three times daily
- SID = Once daily
- PRN = As needed

## Handwritten Prescription Reading Guide:
1. Look for numbered sections: 1) 2) 3) or ① ② ③
2. Arrows (←) usually indicate dosage
3. Fractions: ½ or 0.5 or "half" | ¼ or 0.25 or "quarter"
4. Dashes (-) separate different parts
5. If unclear, give best guess and mark [uncertain]

Rules:
1. List each medication separately: Name | Dose | Frequency | Duration | Route
2. Confidence level: high/medium/low
3. Suggest refill reminder
4. Maximum 150 words`;

      textPrompt = isFarsi
        ? `این نسخه دامپزشکی را بخوان. داروها، دوز، تعداد دفعات و مدت مصرف را استخراج کن. اگر دست‌نویس است و بخشی نامشخص است، بهترین حدس را بزن. سطح اطمینان را هم بگو.`
        : `Read this veterinary prescription. Extract medications, dosages, frequency, and duration. If handwritten and parts are unclear, give your best interpretation. Indicate confidence level.`;
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
            description: "Analyze veterinary prescription and extract structured medication data with refill reminders",
            parameters: {
              type: "object",
              properties: {
                analysis_text: {
                  type: "string",
                  description: "Human-readable summary of the prescription (max 150 words)"
                },
                medications: {
                  type: "array",
                  description: "List of extracted medications",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Medication name (include both Persian and English if known, e.g., 'Amikacin / آمیکاسین')"
                      },
                      dosage: {
                        type: "string",
                        description: "Dosage amount (e.g., '0.3cc', '250mg', '½ tablet')"
                      },
                      frequency: {
                        type: "string",
                        description: "How often (e.g., 'once daily', 'twice daily', 'every 8 hours', 'روزی ۲ بار')"
                      },
                      duration: {
                        type: "string",
                        description: "How long (e.g., '7 days', '۵ روز', 'until finished')"
                      },
                      route: {
                        type: "string",
                        enum: ["oral", "injection_sc", "injection_im", "injection_iv", "topical", "eye_drops", "ear_drops", "other"],
                        description: "Route of administration"
                      }
                    },
                    required: ["name", "dosage", "frequency"]
                  }
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Confidence level in reading the prescription (high=clear print, medium=readable handwriting, low=difficult handwriting)"
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
                      description: "Suggested title for the reminder (e.g., 'Refill Amikacin' or 'تهیه مجدد آمیکاسین')"
                    },
                    days_until_due: {
                      type: "number",
                      description: "Days until medication runs out (0 if already out, positive if still have supply)"
                    }
                  },
                  required: ["needed"]
                }
              },
              required: ["analysis_text", "medications", "confidence", "reminder_suggestion"]
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
      max_tokens: 800,
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
    let medications: any[] = [];
    let confidence: string = '';

    // Check if response used tool calling
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && (toolCall.function?.name === 'analyze_passport' || toolCall.function?.name === 'analyze_prescription')) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        analysis = args.analysis_text;
        reminderSuggestion = args.reminder_suggestion;
        
        // Extract prescription-specific fields
        if (toolCall.function?.name === 'analyze_prescription') {
          medications = args.medications || [];
          confidence = args.confidence || 'medium';
          console.log('Parsed prescription:', { 
            analysis: analysis?.length, 
            medicationCount: medications.length,
            confidence,
            reminderSuggestion 
          });
        } else {
          console.log('Parsed passport response:', { analysis: analysis?.length, reminderSuggestion });
        }
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
    if (medications.length > 0) {
      responseData.medications = medications;
    }
    if (confidence) {
      responseData.confidence = confidence;
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
