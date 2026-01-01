import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderWithPet {
  id: string;
  title: string;
  reminder_type: string;
  due_date: string;
  pet_id: string;
  pets: {
    name: string;
    user_id: string;
  };
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  email_notifications_enabled: boolean;
  preferred_language: string;
}

// Translations for email content
const translations = {
  en: {
    title: 'Your Furry Friends Need You! 🐾',
    greeting: (name: string) => `Hey ${name}! 👋`,
    upcomingReminders: "Here's what's coming up for your beloved pets:",
    openApp: "We know you're busy, but your pets are counting on you! Open PetCare to check details and mark them done when ready. 💪",
    footer: 'You received this email because you love your pets and have email notifications enabled. We promise to only send you the important stuff! 🐕',
    today: "⚡ Today",
    tomorrow: "📅 Tomorrow",
    subject: (count: number) => `🐾 Hey! ${count} pet care reminder${count > 1 ? 's' : ''} waiting for you`,
    todayIntro: "🚨 These need your attention TODAY:",
    tomorrowIntro: "📅 Coming up TOMORROW:",
  },
  fa: {
    title: 'دوستان پشمالوت منتظرتن! 🐾',
    greeting: (name: string) => `سلام ${name} عزیز! 👋`,
    upcomingReminders: 'این برنامه‌های مهم رو برای حیوانات خانگیت داری:',
    openApp: 'می‌دونیم سرت شلوغه، ولی رفقای کوچولوت بهت نیاز دارن! وارد اپ شو و کارها رو تیک بزن. 💪',
    footer: 'این ایمیل رو دریافت کردی چون عاشق حیوانتی و اعلان‌ها رو فعال کردی. قول می‌دیم فقط چیزای مهم رو بفرستیم! 🐕',
    today: '⚡ امروز',
    tomorrow: '📅 فردا',
    subject: (count: number) => `🐾 سلام! ${count} یادآوری مهم برای حیوان خانگیت`,
    todayIntro: '🚨 این‌ها امروز باید انجام بشن:',
    tomorrowIntro: '📅 فردا این برنامه‌ها رو داری:',
  },
};

const getTranslation = (lang: string) => {
  return translations[lang as keyof typeof translations] || translations.fa;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder email check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Checking reminders for today: ${today} and tomorrow: ${tomorrow}`);

    // Fetch reminders due today or tomorrow that are still pending
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, title, reminder_type, due_date, pet_id, pets(name, user_id)')
      .in('due_date', [today, tomorrow])
      .eq('status', 'pending');

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} pending reminders`);

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Group reminders by user
    const remindersByUser = new Map<string, { reminders: ReminderWithPet[]; petNames: Set<string> }>();
    
    for (const reminder of reminders as unknown as ReminderWithPet[]) {
      const userId = reminder.pets?.user_id;
      if (!userId) continue;
      
      if (!remindersByUser.has(userId)) {
        remindersByUser.set(userId, { reminders: [], petNames: new Set() });
      }
      
      const userReminders = remindersByUser.get(userId)!;
      userReminders.reminders.push(reminder);
      userReminders.petNames.add(reminder.pets.name);
    }

    console.log(`Grouped reminders for ${remindersByUser.size} users`);

    // Get profiles for users who have email notifications enabled
    const userIds = Array.from(remindersByUser.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, email_notifications_enabled, preferred_language')
      .in('id', userIds)
      .eq('email_notifications_enabled', true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with email notifications enabled`);

    const emailsSent: string[] = [];

    // Send emails to each user
    for (const profile of (profiles as Profile[]) || []) {
      if (!profile.email) continue;
      
      const userData = remindersByUser.get(profile.id);
      if (!userData) continue;

      const lang = profile.preferred_language || 'fa';
      const t = getTranslation(lang);
      const isRtl = lang === 'fa';
      
      const userName = profile.full_name || (lang === 'fa' ? 'دوست عزیز' : 'Pet Parent');
      
      // Separate today and tomorrow reminders
      const todayReminders = userData.reminders.filter(r => r.due_date === today);
      const tomorrowReminders = userData.reminders.filter(r => r.due_date === tomorrow);
      
      let reminderHtml = '';
      
      if (todayReminders.length > 0) {
        reminderHtml += `<p style="font-weight: bold; color: #dc2626; margin-bottom: 8px;">${(t as any).todayIntro || t.today}</p>`;
        reminderHtml += todayReminders.map(r => 
          `<div style="background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #dc2626;">
            <strong>${r.pets.name}</strong>: ${r.title}
          </div>`
        ).join('');
      }
      
      if (tomorrowReminders.length > 0) {
        reminderHtml += `<p style="font-weight: bold; color: #2563eb; margin-bottom: 8px; margin-top: 16px;">${(t as any).tomorrowIntro || t.tomorrow}</p>`;
        reminderHtml += tomorrowReminders.map(r => 
          `<div style="background: #eff6ff; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #2563eb;">
            <strong>${r.pets.name}</strong>: ${r.title}
          </div>`
        ).join('');
      }

      const html = `
        <div style="font-family: ${isRtl ? 'Tahoma, Arial' : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto"}, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; direction: ${isRtl ? 'rtl' : 'ltr'}; text-align: ${isRtl ? 'right' : 'left'}; background: #ffffff; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #10b981; margin-bottom: 8px; font-size: 24px;">${t.title}</h1>
          </div>
          <p style="font-size: 18px; color: #374151; margin-bottom: 16px;">${t.greeting(userName)}</p>
          <p style="font-size: 16px; color: #6b7280; margin-bottom: 20px;">${t.upcomingReminders}</p>
          
          <div style="margin: 24px 0;">
            ${reminderHtml}
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <p style="color: white; margin: 0; font-size: 14px;">${t.openApp}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            ${t.footer}
          </p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "PetCare <onboarding@resend.dev>",
          to: [profile.email],
          subject: t.subject(userData.reminders.length),
          html,
        });

        console.log(`Email sent to ${profile.email}:`, emailResponse);
        emailsSent.push(profile.email);
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Sent ${emailsSent.length} reminder emails`,
        emails: emailsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-reminder-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
