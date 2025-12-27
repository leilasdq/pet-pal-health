import { Home, FolderHeart, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'داشبورد', labelEn: 'Dashboard' },
  { path: '/vault', icon: FolderHeart, label: 'پرونده', labelEn: 'Vault' },
  { path: '/chat', icon: MessageCircle, label: 'مشاوره', labelEn: 'AI Chat' },
  { path: '/profile', icon: User, label: 'پروفایل', labelEn: 'Profile' },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-nav max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[4.5rem]",
                isActive 
                  ? "text-primary bg-primary-soft" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
