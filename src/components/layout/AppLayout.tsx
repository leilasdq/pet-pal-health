import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const AppLayout = ({ children, showNav = true }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { isRTL } = useLanguage();

  // Mobile: Use bottom navigation only
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

  // Desktop/Tablet: Use sidebar (no bottom nav)
  if (!showNav) {
    return (
      <div className="min-h-screen bg-background">
        <main>{children}</main>
      </div>
    );
  }

  // For both LTR and RTL, keep the same DOM order
  // The Sidebar component handles its own positioning with side prop
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex items-center h-14 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm">
          <SidebarTrigger className="h-8 w-8" />
        </header>
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
