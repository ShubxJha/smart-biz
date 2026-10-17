import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./invitation.css";

export const metadata: Metadata = {
  title: "SmartBiz — Sales overview",
  description: "Sales and business analytics for your shop.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
