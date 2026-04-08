import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KnockAI",
  description: "Door-to-door sales intelligence app",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: '#030308' }}>
        {children}
      </body>
    </html>
  );
}
