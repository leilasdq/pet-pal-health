import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Bot, User, Loader2, Sparkles, PawPrint, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSidebar, ChatMobileSidebar, type ChatSession } from '@/components/chat/ChatSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  session_id?: string;
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
  const { t, isRTL } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
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
      fetchSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

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

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) {
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        // Optional: auto-select most recent session
        // setCurrentSessionId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant',
      })));
    }
    setLoading(false);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  const handleDeleteSession = async (id: string) => {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
    if (error) {
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    let sessionId = currentSessionId;

    try {
      // Create session if needed
      if (!sessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        if (sessionData) {
          sessionId = sessionData.id;
          setCurrentSessionId(sessionId);
          setSessions(prev => [sessionData, ...prev]);
        }
      }

      if (!sessionId) throw new Error("Failed to create session");

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
        session_id: sessionId,
      };
      setMessages(prev => [...prev, tempUserMessage]);

      // Save user message to database
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: sessionId,
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
        session_id: sessionId,
        role: 'assistant',
        content: assistantContent,
      });

      // Add assistant message
      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
        session_id: sessionId,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      // Update session list order
      setSessions(prev => {
        const session = prev.find(s => s.id === sessionId);
        if (!session) return prev;
        return [session, ...prev.filter(s => s.id !== sessionId)];
      });

    } catch (error: any) {
      console.error(error);
      toast({
        title: t('common.error'),
        description: error.message || t('chat.error'),
        variant: 'destructive',
      });
      // Remove optimistic message if it was adding to temp
      // setMessages(prev => prev.filter(m => !m.id.startsWith('temp')));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (authLoading) {
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
      <div className="flex h-[calc(100vh-5rem)] gap-4 px-4 md:px-6 py-4">
        {/* Sidebar */}
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden bg-card border border-border shadow-sm">
          {/* Header */}
          <div className="flex-none px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChatMobileSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
              />
              <div className="w-9 h-9 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <Bot className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg">{t('chat.title')}</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : t('chat.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-bounce-gentle" />
              {/* Pet selector */}
              {pets.length > 0 && (
                <div className="w-32 md:w-48">
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('chat.selectPet')} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <PawPrint className="w-3 h-3" />
                            <span className="truncate">{pet.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {!currentSessionId && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-secondary flex items-center justify-center mb-4 shadow-glow">
                  <Bot className="w-8 h-8 text-secondary-foreground" />
                </div>
                <h2 className="text-lg font-bold mb-2">Hello! 👋</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  {t('chat.subtitle')}
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {[
                    t('chat.suggestion1'),
                    t('chat.suggestion2'),
                    t('chat.suggestion3'),
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-start p-3 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
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
                      "max-w-[85%] p-3 rounded-2xl text-sm",
                      message.role === 'user'
                        ? "chat-bubble-user"
                        : "chat-bubble-assistant"
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
          <div className="flex-none px-4 py-1.5 bg-warning/10 border-t border-warning/20">
            <p className="text-[10px] text-warning-foreground/80 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI advice is not a substitute for professional veterinary care.
            </p>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex-none px-4 py-3 border-t border-border bg-card/50 backdrop-blur-sm">
            <div className="flex gap-2 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="flex-1 pr-10"
                dir={isRTL ? 'rtl' : 'ltr'}
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || sending}
                className="absolute right-1 top-1 h-8 w-8"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:-scale-x-100" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default AIChat;
