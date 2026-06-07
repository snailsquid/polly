import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  className?: string;
}

export function Tooltip({ content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isShown = isVisible || isFocused;

  return (
    <span className={cn('relative inline-flex', className)}>
      <span
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={() => {
          setIsFocused(true);
          showTooltip();
        }}
        onBlur={() => {
          setIsFocused(false);
          hideTooltip();
        }}
      >
        <HelpCircle
          className="h-4 w-4 cursor-help text-muted-foreground inline-block"
          aria-describedby={isShown ? tooltipId : undefined}
          tabIndex={0}
          role="button"
        />
      </span>
      {isShown && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-sm bg-popover text-popover-foreground border border-border rounded-md shadow-md whitespace-nowrap z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {content}
        </span>
      )}
    </span>
  );
}
