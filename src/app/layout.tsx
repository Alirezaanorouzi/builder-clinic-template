import { ClerkProvider } from "@clerk/nextjs";
import { faIR } from "@clerk/localizations/fa-IR";
import { dark } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

import { fa } from "@/lib/i18n/fa";

const vazirmatn = Vazirmatn({
  variable: "--font-geist-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: fa.app.name,
  description: fa.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171717",
  colorScheme: "dark",
};

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? ""

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full min-h-dvh flex-col overflow-x-hidden overscroll-none font-sans">
        {children}
      </body>
    </html>
  );

  if (!clerkPublishableKey) {
    return content;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      localization={faIR}
      appearance={{ theme: dark }}
    >
      {content}
    </ClerkProvider>
  );
}