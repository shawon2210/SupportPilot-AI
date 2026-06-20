import type { Metadata, Viewport } from "next";
import Link from "next/link";
import {
  Rocket,
  Zap,
  Shield,
  BarChart3,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Check,
  Sparkles,
  Globe,
  Users,
  ChevronRight,
} from "lucide-react";

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

const features = [
  {
    icon: BookOpen,
    title: "Knowledge Base",
    desc: "Upload docs, crawl websites, and build a smart knowledge base that powers your AI agent.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Instant, accurate answers from your knowledge base. Streaming responses with source citations.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Track usage, monitor performance, and identify knowledge gaps with detailed analytics.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 compliant with end-to-end encryption, RBAC, audit logs, and SSO support.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Invite team members, assign roles, and collaborate on your AI support workspace.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Globe,
    title: "Embeddable Widget",
    desc: "Deploy a customizable chat widget on any website. React, WordPress, Shopify, and more.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
];

const steps = [
  {
    num: "01",
    title: "Upload Your Docs",
    desc: "Upload PDFs, DOCX, Markdown, or crawl your documentation website.",
  },
  {
    num: "02",
    title: "AI Trains Automatically",
    desc: "Your documents are processed, chunked, and indexed for semantic search.",
  },
  {
    num: "03",
    title: "Deploy & Support",
    desc: "Embed the widget on your site or use the dashboard. AI handles the rest.",
  },
];

const plans = [
  {
    name: "Free",
    price: 0,
    desc: "For trying out SupportPilot",
    features: [
      "2 team members",
      "10 documents",
      "50 messages/day",
      "100MB storage",
      "Basic support",
    ],
    cta: "Get Started Free",
    href: "/sign-up",
    popular: false,
  },
  {
    name: "Starter",
    price: 29,
    desc: "For small teams getting started",
    features: [
      "5 team members",
      "100 documents",
      "500 messages/day",
      "1GB storage",
      "Email support",
      "Custom branding",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    popular: true,
  },
  {
    name: "Pro",
    price: 99,
    desc: "For growing support teams",
    features: [
      "25 team members",
      "1,000 documents",
      "5,000 messages/day",
      "10GB storage",
      "Priority support",
      "API access",
      "Analytics",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    popular: false,
  },
  {
    name: "Enterprise",
    price: -1,
    desc: "For large organizations",
    features: [
      "Unlimited members",
      "Unlimited documents",
      "Unlimited messages",
      "Unlimited storage",
      "Dedicated support",
      "SLA guarantee",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/sign-up",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen min-h-dvh bg-background text-foreground">
      {/* ─── Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-sticky border-b border-border bg-background/80 glass">
        <div className="page-container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/25 transition-shadow">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">SupportPilot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative page-container pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
            <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs sm:text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-Powered Customer Support Platform
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                AI support that
                <br />
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                  scales with your team
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Upload your documentation, train an AI agent, and deploy it on your
                website in minutes. No complex setup required.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border bg-background font-medium hover:bg-accent transition-colors text-sm sm:text-base"
                >
                  Learn More
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              {/* Social proof */}
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="flex -space-x-2">
                  {[
                    "from-pink-400 to-rose-500",
                    "from-blue-400 to-indigo-500",
                    "from-green-400 to-emerald-500",
                    "from-amber-400 to-orange-500",
                    "from-purple-400 to-violet-500",
                  ].map((bg, i) => (
                    <div
                      key={i}
                      className={`h-8 w-8 rounded-full bg-gradient-to-br ${bg} border-2 border-background flex items-center justify-center text-[10px] font-bold text-white`}
                    >
                      {["JD", "AK", "MR", "SL", "TC"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Trusted by <span className="text-foreground font-semibold">2,000+</span> support teams worldwide
                </p>
              </div>
            </div>

            {/* Hero visual — dashboard preview mockup */}
            <div className="mt-12 sm:mt-16 max-w-4xl mx-auto">
              <div className="rounded-xl border border-border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-block px-3 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
                      app.supportpilot.ai/dashboard
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: "Messages", value: "12,847", change: "+12%" },
                    { label: "Chats", value: "3,421", change: "+8%" },
                    { label: "Documents", value: "156", change: "+3%" },
                    { label: "Avg Response", value: "1.2s", change: "-5%" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg sm:text-2xl font-bold mt-1">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs text-green-500 mt-0.5">{stat.change}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="rounded-lg border border-border p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">Recent Activity</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { msg: "New conversation started", time: "2 min ago" },
                        { msg: "Document uploaded: FAQ.pdf", time: "15 min ago" },
                        { msg: "Conversation resolved", time: "1 hour ago" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">{item.msg}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap ml-2">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────── */}
        <section id="features" className="py-12 sm:py-16 lg:py-20 border-t border-border">
          <div className="page-container">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Everything you need for AI-powered support
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                A complete platform for managing knowledge, automating responses, and
                scaling your support team with AI.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-xl border border-border bg-card p-5 sm:p-6 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className={`inline-flex p-2.5 rounded-lg ${f.bg} mb-4`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─────────────────────────────────── */}
        <section id="how-it-works" className="py-12 sm:py-16 lg:py-20 border-t border-border bg-muted/20">
          <div className="page-container">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Up and running in 3 steps
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-3">
                No complex configuration. No ML expertise required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.num} className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                    <span className="text-xl font-bold text-primary">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ──────────────────────────────────────── */}
        <section id="pricing" className="py-12 sm:py-16 lg:py-20 border-t border-border">
          <div className="page-container">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-3">
                Start free. Scale as you grow. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-xl border bg-card p-5 sm:p-6 flex flex-col ${
                    plan.popular
                      ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        <Sparkles className="h-3 w-3" /> Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? "Free" : plan.price === -1 ? "Custom" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────── */}
        <section className="py-12 sm:py-16 lg:py-20 border-t border-border bg-muted/20">
          <div className="page-container text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Ready to transform your support?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Join 2,000+ support teams using SupportPilot to deliver instant, accurate
                answers to their customers.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border bg-background font-medium hover:bg-accent transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 sm:py-10">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Rocket className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold">SupportPilot</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Docs</a>
              <a href="#" className="hover:text-foreground transition-colors">Status</a>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SupportPilot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
