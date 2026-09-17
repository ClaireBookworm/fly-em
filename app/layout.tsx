import type { Metadata } from 'next';
import './globals.css';
import './theme.css';
import './fonts.css';
import './editorial.css';
export const metadata: Metadata = {
  title: 'Fly Circuit Observatory',
  description:
    'Explore three fly brain circuits and compare anatomical wiring, model dynamics, and experimental physiology.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="light"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t='light';try{if(localStorage.getItem('fly-em-theme')==='dark')t='dark'}catch(e){}document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('light',t==='light')})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
