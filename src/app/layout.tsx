import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { FirmProvider } from "@/components/providers/firm-provider";
import { CommandBarProvider } from "@/components/features/command-bar/command-bar-provider";
import { GlobalDialogsProvider } from "@/hooks/use-global-dialogs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas — Fund Administration Platform",
  description: "Family Office GP Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <ToastProvider>
          <FirmProvider>
            <GlobalDialogsProvider>
              <CommandBarProvider>
                <AppShell>{children}</AppShell>
              </CommandBarProvider>
            </GlobalDialogsProvider>
          </FirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
