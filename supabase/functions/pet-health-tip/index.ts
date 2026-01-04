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
    const { pet } = await req.json();

    if (!pet) {
      throw new Error('No pet data provided');
    }

    console.log('Generating health tip for pet:', pet);

    // Calculate age from birth_date
    let ageText = 'نامشخص';
    if (pet.birth_date) {
      const birthDate = new Date(pet.birth_date);
      const now = new Date();
      const years = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor(((now.getTime() - birthDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
      if (years > 0) {
        ageText = `${years} سال و ${months} ماه`;
      } else {
        ageText = `${months} ماه`;
      }
    }

    const petTypeText = pet.pet_type === 'dog' ? 'سگ' : 'گربه';
    const genderText = pet.gender === 'male' ? 'نر' : pet.gender === 'female' ? 'ماده' : 'نامشخص';
    const neuteredText = pet.is_neutered ? 'بله' : 'خیر';
    const activityText = pet.activity_level === 'low' ? 'کم' : pet.activity_level === 'moderate' ? 'متوسط' : pet.activity_level === 'high' ? 'زیاد' : 'نامشخص';

    const systemPrompt = `شما یک متخصص تغذیه و سلامت حیوانات خانگی هستید. وظیفه شما این است که یک نکته سلامتی کوتاه و کاربردی (حداکثر ۳ جمله) به زبان فارسی برای یک حیوان خانگی جدید بنویسید.

نکته باید:
- دوستانه و گرم باشد
- روی تغذیه یا یک احتیاط بهداشتی مرتبط با نژاد تمرکز کند
- عملی و قابل اجرا باشد
- از ایموجی استفاده کند

فقط نکته را بنویسید، بدون مقدمه یا توضیح اضافی.`;

    const userPrompt = `اطلاعات حیوان خانگی:
- نوع: ${petTypeText}
- نام: ${pet.name}
- نژاد: ${pet.breed || 'نامشخص'}
- سن: ${ageText}
- وزن: ${pet.weight ? `${pet.weight} کیلوگرم` : 'نامشخص'}
- جنسیت: ${genderText}
- عقیم شده: ${neuteredText}
- سطح فعالیت: ${activityText}
- آلرژی/شرایط پزشکی: ${pet.allergies || 'ندارد'}

لطفاً یک نکته سلامتی کوتاه و کاربردی برای این ${petTypeText} بنویسید.`;

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', tip: 'نکته سلامتی در حال حاضر در دسترس نیست. 🐾' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', tip: 'نکته سلامتی در حال حاضر در دسترس نیست. 🐾' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content || 'از سلامت دوست کوچولوی خود مراقبت کنید! 🐾💚';

    console.log('Health tip generated:', tip);

    return new Response(
      JSON.stringify({ tip }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pet-health-tip:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        tip: 'از سلامت دوست کوچولوی خود مراقبت کنید! 🐾💚'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
