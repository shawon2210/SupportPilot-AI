import type { Metadata, Viewport } from "next";
import { LandingContent } from "@/components/landing-content";

export const metadata: Metadata = {
  title: "SupportPilot AI — AI-Powered Customer Support Platform",
  description:
    "Upload your documentation, train an AI agent, and deploy it on your website in minutes. Multi-tenant AI customer support with knowledge base, analytics, and team collaboration.",
  keywords: [
    "AI support",
    "customer support",
    "knowledge base",
    "chatbot",
    "help desk",
    "AI agent",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function LandingPage() {
  return <LandingContent />;
}
