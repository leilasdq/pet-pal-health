import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2, Sparkles, PawPrint, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
}

const AIChat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchPets = async () => {
    const { data } = await supabase.from('pets').select('*');
    if (data) {
      setPets(data);
      if (data.length > 0 && !selectedPetId) {
        setSelectedPetId(data[0].id);
      }
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant',
      })));
    }
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Get selected pet context
    const selectedPet = pets.find(p => p.id === selectedPetId);
    const petContext = selectedPet ? {
      name: selectedPet.name,
      breed: selectedPet.breed,
      birth_date: selectedPet.birth_date,
      weight: selectedPet.weight,
    } : null;

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Save user message to database
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'user',
        content: userMessage,
        pet_context: petContext,
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke('pet-ai-assistant', {
        body: {
          user_message: userMessage,
          pet_context: petContext,
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantContent = data?.response || 'I apologize, but I was unable to process your request. Please try again.';

      // Save assistant response to database
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantContent,
      });

      // Add assistant message
      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center">
                <Bot className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">AI Vet Assistant</h1>
                <p className="text-xs text-muted-foreground">Ask health questions</p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-primary animate-bounce-gentle" />
          </div>
          
          {/* Pet selector */}
          {pets.length > 0 && (
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a pet for context" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4" />
                      {pet.name} {pet.breed && `(${pet.breed})`}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-secondary flex items-center justify-center mb-4 shadow-glow">
                <Bot className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Hello! 👋</h2>
              <p className="text-muted-foreground mb-6 max-w-xs">
                I'm your AI Vet Assistant. Ask me anything about your pet's health, nutrition, or behavior.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {[
                  "My dog isn't eating well",
                  "How often should I vaccinate?",
                  "Signs of dehydration in cats",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-left p-3 rounded-xl bg-muted/50 hover:bg-muted text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-slide-up",
                    message.role === 'user' ? "flex-row-reverse" : ""
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary text-secondary-foreground"
                  )}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl",
                    message.role === 'user' 
                      ? "chat-bubble-user" 
                      : "chat-bubble-assistant"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="chat-bubble-assistant p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Disclaimer */}
        <div className="px-4 py-2 bg-warning/10 border-t border-warning/20">
          <p className="text-[10px] text-warning-foreground/80 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            AI advice is not a substitute for professional veterinary care.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="px-4 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default AIChat;
