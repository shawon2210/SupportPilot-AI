import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";
import { AuthHydrator } from "@/providers/auth-hydrator";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SupportPilot AI",
  description:
    "Multi-tenant AI Customer Support Platform. Upload documentation, train AI agents, and deploy on your website in minutes.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  keywords: [
    "AI support",
    "customer support",
    "knowledge base",
    "chatbot",
    "help desk",
    "AI agent",
  ],
  openGraph: {
    title: "SupportPilot AI — AI-Powered Customer Support Platform",
    description:
      "Upload your documentation, train an AI agent, and deploy it on your website in minutes. Multi-tenant AI customer support with knowledge base, analytics, and team collaboration.",
    type: "website",
    locale: "en_US",
    siteName: "SupportPilot AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupportPilot AI — AI-Powered Customer Support Platform",
    description:
      "Upload your documentation, train an AI agent, and deploy it on your website in minutes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors />
          </QueryProvider>
        </ThemeProvider>
        <AuthHydrator />
      </body>
    </html>
  );
}
