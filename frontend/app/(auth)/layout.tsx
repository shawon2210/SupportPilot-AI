import { Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const features = [
  { icon: Zap, title: "AI-Powered Responses", desc: "Instant, accurate answers from your knowledge base" },
  { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliant with end-to-end encryption" },
  { icon: Sparkles, title: "Smart Automation", desc: "Auto-classify, route, and resolve support tickets" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Left brand panel — hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-300 rounded-full blur-2xl animate-pulse-glow" />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-3 group">
              <Logo size="md" showLabel={false} className="group-hover:scale-105 transition-transform" />
              <span className="text-2xl font-bold tracking-tight">SupportPilot</span>
            </Link>
          </div>

          {/* Hero content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
                AI-powered support that
                <span className="block text-blue-200">scales with your team</span>
              </h1>
              <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
                Upload your documentation, train an AI agent, and deploy it on your website in minutes.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="h-4 w-4 text-blue-200" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{f.title}</p>
                    <p className="text-sm text-blue-200/70">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="space-y-3">
            <div className="flex -space-x-2">
              {[
                'bg-gradient-to-br from-pink-400 to-rose-500',
                'bg-gradient-to-br from-blue-400 to-indigo-500',
                'bg-gradient-to-br from-green-400 to-emerald-500',
                'bg-gradient-to-br from-amber-400 to-orange-500',
                'bg-gradient-to-br from-purple-400 to-violet-500',
              ].map((bg, i) => (
                <div key={i} className={`h-8 w-8 rounded-full ${bg} border-2 border-indigo-600 flex items-center justify-center text-[10px] font-bold text-white`}>
                  {['JD', 'AK', 'MR', 'SL', 'TC'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-blue-200/70">
              Trusted by <span className="text-white font-semibold">2,000+</span> support teams worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showLabel={false} />
            <span className="text-lg font-bold">SupportPilot</span>
          </Link>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-[400px] animate-fade-in">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
