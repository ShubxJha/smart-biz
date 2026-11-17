import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./invitation.css";
import "./data-entry.css";

export const metadata: Metadata = {
  title: "SmartBiz — Sales Management & Business Analytics",
  description: "Modern sales management, customer records, inventory tracking, and business analytics for small businesses.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('smartbiz-theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
