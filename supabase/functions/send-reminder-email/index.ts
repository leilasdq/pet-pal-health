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
}

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
      .select('id, email, full_name, email_notifications_enabled')
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

      const userName = profile.full_name || 'Pet Parent';
      const reminderList = userData.reminders.map(r => {
        const isToday = r.due_date === today;
        const dateLabel = isToday ? 'Today' : 'Tomorrow';
        return `• ${r.title} for ${r.pets.name} (${dateLabel})`;
      }).join('\n');

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981; margin-bottom: 20px;">🐾 PetCare Reminder</h1>
          <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
          <p style="font-size: 16px; color: #374151;">You have upcoming reminders for your pets:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <pre style="margin: 0; white-space: pre-wrap; font-family: inherit; color: #1f2937;">${reminderList}</pre>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Open PetCare to view details and mark them as complete.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #9ca3af;">
            You received this email because you have email notifications enabled in your PetCare profile.
          </p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "PetCare <onboarding@resend.dev>",
          to: [profile.email],
          subject: `🐾 Pet Reminder: ${userData.reminders.length} upcoming task${userData.reminders.length > 1 ? 's' : ''}`,
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
