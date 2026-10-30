import "./globals.css";
import "@/styles/motion.css";
import "@/styles/date-picker.css";
import "@/styles/glass-workspace.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Paisa · Personal Expense Tracker",
  description: "Your private, local-first personal expense tracker.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
