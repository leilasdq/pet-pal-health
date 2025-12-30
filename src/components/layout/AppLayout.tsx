import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const AppLayout = ({ children, showNav = true }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { isRTL } = useLanguage();

  // Mobile: Use bottom navigation
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <main className={showNav ? "safe-bottom" : ""}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    );
  }

  // Desktop/Tablet: Use sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <div className={cn("min-h-screen flex w-full", isRTL && "flex-row-reverse")}>
        {showNav && <AppSidebar />}
        <main className="flex-1 bg-background overflow-auto">
          {showNav && (
            <div className={cn(
              "sticky top-0 z-40 flex items-center h-14 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm",
              isRTL ? "flex-row-reverse" : ""
            )}>
              <SidebarTrigger className="h-8 w-8" />
            </div>
          )}
          <div className="p-0">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
