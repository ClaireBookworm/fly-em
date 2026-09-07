import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Fly Circuit Observatory',
  description:
    'Explore three fly brain circuits and compare anatomical wiring, model dynamics, and experimental physiology.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
