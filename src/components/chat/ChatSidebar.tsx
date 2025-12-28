import { PlusCircle, MessageSquare, Trash2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from 'react';

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
}

interface ChatSidebarProps {
    sessions: ChatSession[];
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession?: (id: string) => void;
    className?: string;
}

const SidebarContent = ({
    sessions,
    currentSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onClose
}: ChatSidebarProps & { onClose?: () => void }) => {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm border-r border-border/50">
            <div className="p-4 border-b border-border/50">
                <Button
                    onClick={() => {
                        onNewChat();
                        if (onClose) onClose();
                    }}
                    className="w-full justify-start gap-2"
                >
                    <PlusCircle className="w-4 h-4" />
                    {t('chat.newChat')}
                </Button>
            </div>

            <ScrollArea className="flex-1 px-2 py-3">
                <div className="space-y-1">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                "group flex items-center gap-2 w-full p-2 rounded-lg text-sm transition-colors cursor-pointer",
                                currentSessionId === session.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                            onClick={() => {
                                onSelectSession(session.id);
                                if (onClose) onClose();
                            }}
                        >
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1 text-start">
                                {session.title || 'New Chat'}
                            </span>
                            {onDeleteSession && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSession(session.id);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export const ChatSidebar = (props: ChatSidebarProps) => {
    return (
        <div className={cn("hidden md:flex w-64 shrink-0 flex-col h-[calc(100vh-5rem)] sticky top-20 rounded-xl overflow-hidden shadow-sm border border-border", props.className)}>
            <SidebarContent {...props} />
        </div>
    );
};

export const ChatMobileSidebar = (props: ChatSidebarProps) => {
    const [open, setOpen] = useState(false);
    const { isRTL } = useLanguage();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-80">
                <SidebarContent {...props} onClose={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
};
