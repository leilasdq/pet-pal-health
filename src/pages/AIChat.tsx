import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Bot, User, Loader2, Sparkles, PawPrint, AlertCircle, Plus, MessageSquare, Trash2, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

interface Conversation {
  id: string;
  title: string;
  pet_id: string | null;
  created_at: string;
  updated_at: string;
}

const AIChat = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

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

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (data) {
      setConversations(data);
      // Select the most recent conversation if none selected
      if (data.length > 0 && !currentConversationId) {
        setCurrentConversationId(data[0].id);
        if (data[0].pet_id) {
          setSelectedPetId(data[0].pet_id);
        }
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as 'user' | 'assistant',
      })));
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    const selectedPet = pets.find(p => p.id === selectedPetId);
    const title = selectedPet ? `Chat about ${selectedPet.name}` : 'New Chat';

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title,
        pet_id: selectedPetId || null,
      })
      .select()
      .single();

    if (data) {
      setConversations(prev => [data, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      setShowSidebar(false);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
    
    if (currentConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
      } else {
        setCurrentConversationId(null);
      }
    }
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    if (conv.pet_id) {
      setSelectedPetId(conv.pet_id);
    }
    setShowSidebar(false);
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

    // Create conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      const title = selectedPet ? `Chat about ${selectedPet.name}` : userMessage.slice(0, 50);
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          pet_id: selectedPetId || null,
        })
        .select()
        .single();
      
      if (newConv) {
        conversationId = newConv.id;
        setCurrentConversationId(newConv.id);
        setConversations(prev => [newConv, ...prev]);
      }
    }

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
        conversation_id: conversationId,
      });

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        
        setConversations(prev => prev.map(c => 
          c.id === conversationId ? { ...c, title } : c
        ));
      }

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
        conversation_id: conversationId,
      });

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

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
        title: t('common.error'),
        description: t('chat.error'),
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
      <div className="flex h-[calc(100vh-5rem)] relative" dir="ltr">
        {/* Sidebar overlay for mobile */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar - always visible on desktop, slide-in on mobile */}
        {(() => {
          // Only apply collapsed state on desktop
          const isCollapsed = !isMobile && sidebarCollapsed;
          
          return (
            <aside 
              className={cn(
                "chat-sidebar",
                isCollapsed && "md:w-16"
              )}
              data-open={showSidebar}
              data-collapsed={isCollapsed}
            >
              {/* Sidebar header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                {!isCollapsed && (
                  <h2 className="font-semibold text-sm">{t('chat.history')}</h2>
                )}
                <div className="flex items-center gap-1">
                  {/* Collapse button - desktop only */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex h-8 w-8"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? "Expand" : "Collapse"}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </Button>
                  {/* Close button - mobile only */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setShowSidebar(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* New chat button */}
              <div className="p-3">
                <Button 
                  onClick={() => {
                    createNewConversation();
                    setShowSidebar(false);
                  }} 
                  className={cn("gap-2", isCollapsed ? "w-10 p-0" : "w-full")}
                  variant="default"
                  title={isCollapsed ? t('chat.newChat') : undefined}
                >
                  <Plus className="w-4 h-4" />
                  {!isCollapsed && t('chat.newChat')}
                </Button>
              </div>
              
              {/* Conversations list */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                      currentConversationId === conv.id && "bg-muted",
                      isCollapsed && "justify-center p-2"
                    )}
                    onClick={() => {
                      selectConversation(conv);
                      setShowSidebar(false);
                    }}
                    title={isCollapsed ? conv.title : undefined}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate text-sm">{conv.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {conversations.length === 0 && !isCollapsed && (
                  <p className="text-center text-sm text-muted-foreground p-4">
                    {t('chat.noChats')}
                  </p>
                )}
              </div>
            </aside>
          );
        })()}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Hamburger menu for mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                  onClick={() => setShowSidebar(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="w-9 h-9 rounded-xl bg-gradient-secondary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-base">{t('chat.title')}</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">{t('chat.subtitle')}</p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-primary animate-bounce-gentle" />
            </div>
            
            {/* Pet selector */}
            {pets.length > 0 && (
              <div className="mt-3">
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('chat.selectPet')} />
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
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-secondary flex items-center justify-center mb-4 shadow-glow">
                  <Bot className="w-10 h-10 text-secondary-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t('chat.welcome')}</h2>
                <p className={cn("text-muted-foreground mb-6 max-w-xs", isRTL ? "text-right" : "text-left")}>
                  {t('chat.subtitle')}
                </p>
                <div className={cn("flex flex-col gap-2 w-full max-w-xs", isRTL && "items-end")}>
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
                      className={cn("p-3 rounded-xl bg-muted/50 hover:bg-muted text-sm transition-colors", isRTL ? "text-right" : "text-left")}
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
              {t('chat.disclaimer')}
            </p>
          </div>

          {/* Input - always LTR layout so send button is on right */}
          <form onSubmit={sendMessage} className="px-4 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2" dir="ltr">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="flex-1 order-1"
                dir={isRTL ? 'rtl' : 'ltr'}
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || sending} className="order-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default AIChat;