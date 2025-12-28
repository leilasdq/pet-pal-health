import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};



serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_message, pet_context, conversation_history } = await req.json();

    if (!user_message) {
      throw new Error('No message provided');
    }

    console.log('Received message:', user_message);
    console.log('Pet context:', pet_context);

    // Build system prompt with pet context
    let systemPrompt = `You are a warm, empathetic, and knowledgeable Veterinary Assistant. 
    
    CORE BEHAVIORS:
    - Language: Communicate ONLY in Persian (Farsi). NEVER use English, Thai, Hindi, or other non-Persian scripts in your output.
    - Tone: Friendly, reassuring, and professional. Act like a caring pet lover who happens to be an expert.
    - Empathy: Always acknowledge the owner's feelings (e.g., "I'm so sorry your pet is feeling unwell").
    - Safety: If symptoms suggest an emergency (vomiting blood, difficulty breathing, seizures, etc.), IMMEDIATELY advise visiting a vet in BOLD text.
    
    CONSULTATION APPROACH:
    - Do not diagnose medical conditions.
    - If the user provides vague symptoms, ask naturally for more details (e.g., "How long has this been happening?" or "Is he eating normally?"). 
    - Don't barrage the user with a list of questions; keep it conversational.
    - Once you have enough context, provide general veterinary advice and home care tips if appropriate.`;

    if (pet_context) {
      systemPrompt += `\n\nAbout the pet:
    - Name: ${pet_context.name || 'Unknown'}
    - Breed: ${pet_context.breed || 'Unknown'}
    - Age/Birthday: ${pet_context.birth_date || 'Unknown'}
    - Weight: ${pet_context.weight ? `${pet_context.weight} kg` : 'Unknown'}
    
    Please mention the pet's name when appropriate to make it personal.`;
    }

    // Build messages array (Standard OpenAI format for Groq)
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

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    console.log('Sending request to Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to process your request. Please try again.';

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in pet-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        response: `DEBUG ERROR: ${errorMessage}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
