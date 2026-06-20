import { Rocket } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <Rocket className="h-10 w-10" />
            <span className="text-3xl font-bold">SupportPilot</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">AI-powered customer support</h1>
          <p className="text-lg text-white/80">
            Upload your documentation, train an AI agent, and deploy it on your website in minutes.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SupportPilot</span>
          </div>
          {children}
          <p className="text-center text-sm text-muted-foreground mt-8">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
