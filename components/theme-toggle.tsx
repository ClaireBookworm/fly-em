'use client';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setTheme, useTheme } from '@/lib/theme';
export function ThemeToggle() {
  const theme = useTheme(),
    next = theme === 'light' ? 'dark' : 'light';
  return (
    <Button
      className="theme-toggle"
      variant="outline"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      <span>{next === 'light' ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  );
}
