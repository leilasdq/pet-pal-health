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
    const { user_message, pet_context, conversation_history } = await req.json();

    if (!user_message) {
      throw new Error('No message provided');
    }

    console.log('Received message:', user_message);
    console.log('Pet context:', pet_context);

    // Build system prompt with pet context
    let systemPrompt = `You are a friendly and knowledgeable AI Veterinary Assistant called "PetCare AI". 
Your role is to provide helpful, accurate, and caring advice about pet health, nutrition, behavior, and general care.

Important guidelines:
1. Always be empathetic and understanding towards pet owners
2. Provide practical and actionable advice
3. When symptoms seem serious, always recommend consulting a real veterinarian
4. Never diagnose specific conditions - only provide general information
5. Be encouraging and supportive
6. Keep responses concise but informative (2-3 paragraphs max)
7. Use simple language that any pet owner can understand
8. If asked about emergencies, emphasize the importance of immediate veterinary care

Remember: You are NOT a replacement for professional veterinary care. Always encourage users to seek professional help for serious concerns.`;

    if (pet_context) {
      systemPrompt += `\n\nCurrent Pet Context:
- Name: ${pet_context.name || 'Unknown'}
- Breed: ${pet_context.breed || 'Unknown'}
- Birth Date: ${pet_context.birth_date || 'Unknown'}
- Weight: ${pet_context.weight ? `${pet_context.weight} kg` : 'Unknown'}

Use this information to personalize your responses when relevant.`;
    }

    // Build messages array
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

    console.log('Sending request to Lovable AI Gateway...');

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to process your request. Please try again.';

    console.log('AI Response received successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pet-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: 'I apologize, but I encountered an error. Please try again in a moment.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
