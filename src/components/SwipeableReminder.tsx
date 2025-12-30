import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableReminderProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

export const SwipeableReminder = ({ children, onDelete, className }: SwipeableReminderProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const deleteThreshold = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow swiping left (negative values), with resistance
    if (diff < 0) {
      const resistance = 0.5;
      const newTranslate = Math.max(diff * resistance, -100);
      setTranslateX(newTranslate);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX < deleteThreshold) {
      // Keep it open to show delete button
      setTranslateX(-80);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    // Animate out
    setTranslateX(-300);
    setTimeout(() => {
      onDelete();
    }, 200);
  };

  const handleClickOutside = () => {
    if (translateX !== 0) {
      setTranslateX(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-xl", className)}
    >
      {/* Delete button background */}
      <div 
        className="absolute inset-y-0 end-0 flex items-center justify-end bg-destructive px-4 rounded-xl"
        style={{ width: '80px' }}
      >
        <button 
          onClick={handleDelete}
          className="flex items-center justify-center w-10 h-10 text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Swipeable content */}
      <div
        className={cn(
          "relative bg-background z-10",
          !isDragging && "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickOutside}
      >
        {children}
      </div>
    </div>
  );
};
