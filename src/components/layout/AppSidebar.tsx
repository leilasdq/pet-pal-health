import { Home, FolderHeart, MessageCircle, User, Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { path: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
  { path: '/vault', icon: FolderHeart, labelKey: 'nav.vault' },
  { path: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar 
      side={isRTL ? 'right' : 'left'} 
      collapsible="icon"
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-4">
        <div className={cn(
          "flex items-center gap-3 w-full",
          isCollapsed && "justify-center",
          isRTL && "justify-end"
        )}>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary/20" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className={cn("flex flex-col", isRTL && "items-end")}>
              <span className="font-bold text-lg text-foreground">PetCare</span>
              <span className="text-xs text-muted-foreground">{t('auth.subtitle')}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="mx-4 w-auto" />

      {/* Navigation Items */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={isActive}
                      tooltip={t(item.labelKey)}
                      className={cn(
                        "transition-all duration-200",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-2 w-full",
                        isRTL && "justify-end"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 shrink-0",
                          isActive && "text-primary"
                        )} />
                        <span>{t(item.labelKey)}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Info */}
      <SidebarFooter className="p-4 mt-auto">
        <Separator className="mb-4" />
        <div className={cn(
          "flex items-center gap-3 w-full",
          isCollapsed && "justify-center",
          isRTL && "justify-end"
        )}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className={cn("flex flex-col min-w-0", isRTL && "items-end")}>
              <span className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
