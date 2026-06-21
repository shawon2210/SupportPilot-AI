"use client";

import { useState, useEffect } from "react";
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
import { LandingHeader } from "@/components/landing-header";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BookOpen,
    title: "Knowledge Base",
    desc: "Upload docs, crawl websites, and build a smart knowledge base that powers your AI agent.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "group-hover:border-blue-500/30",
    glow: "group-hover:shadow-blue-500/5",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Instant, accurate answers from your knowledge base. Streaming responses with source citations.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "group-hover:border-green-500/30",
    glow: "group-hover:shadow-green-500/5",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Track usage, monitor performance, and identify knowledge gaps with detailed analytics.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "group-hover:border-purple-500/30",
    glow: "group-hover:shadow-purple-500/5",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 compliant with end-to-end encryption, RBAC, audit logs, and SSO support.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "group-hover:border-orange-500/30",
    glow: "group-hover:shadow-orange-500/5",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Invite team members, assign roles, and collaborate on your AI support workspace.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "group-hover:border-pink-500/30",
    glow: "group-hover:shadow-pink-500/5",
  },
  {
    icon: Globe,
    title: "Embeddable Widget",
    desc: "Deploy a customizable chat widget on any website. React, WordPress, Shopify, and more.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "group-hover:border-indigo-500/30",
    glow: "group-hover:shadow-indigo-500/5",
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
    monthlyPrice: 0,
    annualPrice: 0,
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
    monthlyPrice: 29,
    annualPrice: 23,
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
    monthlyPrice: 99,
    annualPrice: 79,
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
    monthlyPrice: -1,
    annualPrice: -1,
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

export function LandingContent() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [messagesCount, setMessagesCount] = useState(12847);
  const [avgResponse, setAvgResponse] = useState(1.2);
  const [chatsCount, setChatsCount] = useState(3421);
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);

  // Live mockup simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMessagesCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
      setChatsCount((prev) => prev + (Math.random() > 0.6 ? 1 : 0));
      setAvgResponse((prev) => {
        const diff = (Math.random() - 0.5) * 0.08;
        const newVal = Math.max(0.9, Math.min(1.4, prev + diff));
        return parseFloat(newVal.toFixed(1));
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Cycle recent activities list
  const activities = [
    { msg: "New conversation resolved by AI", time: "Just now", type: "chat" },
    { msg: "Document uploaded: FAQ.pdf", time: "15 min ago", type: "doc" },
    { msg: "AI response latency optimized to 1.1s", time: "28 min ago", type: "system" },
    { msg: "New team member invited to workspace", time: "1 hour ago", type: "team" },
    { msg: "Knowledge gaps report generated", time: "2 hours ago", type: "analytics" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveActivityIndex((prev) => (prev + 1) % activities.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activities.length]);

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[700px] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[800px] right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      <LandingHeader />

      <main id="main-content" className="relative z-10">
        {/* ─── Hero ──────────────────────────────────────────── */}
        <section className="relative pt-12 sm:pt-16 lg:pt-28 pb-16 sm:pb-20 lg:pb-28">
          <div className="page-container">
            <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 mb-16 sm:mb-20">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/60 text-xs sm:text-sm text-muted-foreground hover:border-primary/20 transition-all hover:bg-muted/80">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span>Introducing SupportPilot 2.0</span>
                <span className="h-3 w-px bg-border" />
                <span className="text-primary font-medium flex items-center gap-0.5">
                  See what's new <ChevronRight className="h-3 w-3" />
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-3xl mx-auto">
                AI support that
                <br />
                <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent drop-shadow-sm">
                  scales with your team
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your documentation, train a smart AI agent, and deploy a chat widget on your website in minutes. No complex ML setup required.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-sm mx-auto sm:max-w-none">
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-background/50 backdrop-blur-sm font-medium hover:bg-accent transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base"
                >
                  Learn More
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              {/* Social proof */}
              <div className="flex flex-col items-center gap-3 pt-4">
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
                      className={cn(
                        "h-9 w-9 rounded-full bg-gradient-to-br border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                        bg
                      )}
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

            {/* Hero Dashboard Preview Mockup */}
            <div className="max-w-5xl mx-auto animate-float">
              <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-2xl shadow-primary/5 overflow-hidden">
                {/* Header Mockup */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/70" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                    <div className="h-3 w-3 rounded-full bg-green-500/70" />
                  </div>
                  <div className="flex-1 text-center hidden sm:block">
                    <div className="inline-block px-4 py-0.5 rounded-md bg-muted/80 text-[10px] text-muted-foreground font-mono">
                      app.supportpilot.ai/workspace/overview
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-medium text-emerald-500/90 font-mono">LIVE CONNECTED</span>
                  </div>
                </div>

                {/* Stat grid Mockup */}
                <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: "Messages Handled", value: messagesCount.toLocaleString(), change: "+14.8%", color: "text-blue-500" },
                    { label: "Total Chats", value: chatsCount.toLocaleString(), change: "+8.2%", color: "text-green-500" },
                    { label: "Active Documents", value: "156", change: "+4.1%", color: "text-purple-500" },
                    { label: "Avg AI Response", value: `${avgResponse}s`, change: "-12%", color: "text-orange-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border/50 bg-background/30 p-4 transition-all hover:bg-background/50 hover:border-primary/20">
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1 tracking-tight tabular-nums">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs font-medium mt-1 text-green-500">
                        {stat.change} this week
                      </p>
                    </div>
                  ))}
                </div>

                {/* Sub-layout Mockup */}
                <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-xl border border-border/50 bg-background/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-xs sm:text-sm font-semibold">Active AI Resolution Stream</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Auto-pilot</span>
                    </div>

                    <div className="space-y-3 min-h-[140px] flex flex-col justify-end">
                      <div className="rounded-lg bg-muted/40 p-3 max-w-[85%] text-xs text-muted-foreground self-start animate-fade-up">
                        <p className="font-semibold text-foreground mb-0.5">Customer:</p>
                        "How do I set up a custom domains callback in the dashboard settings?"
                      </div>
                      <div className="rounded-lg bg-primary/10 border border-primary/10 p-3 max-w-[85%] text-xs self-end text-primary-foreground bg-primary/95 shadow-md shadow-primary/10 animate-slide-up">
                        <div className="flex items-center gap-1.5 font-semibold mb-1 text-white">
                          <Zap className="h-3 w-3 text-yellow-300 animate-pulse fill-yellow-300" />
                          <span>SupportPilot AI Agent:</span>
                        </div>
                        "Go to settings &gt; widget, click the custom domains tab, add your record, and update CNAME. Read more in our CNAME guide."
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/30 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        <span className="text-xs sm:text-sm font-semibold">Live System Events</span>
                      </div>
                      <div className="space-y-2.5">
                        {activities.map((item, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center justify-between py-2 border-b border-border/40 last:border-0 transition-all duration-500",
                              idx === activeActivityIndex ? "opacity-100 translate-x-1" : "opacity-40"
                            )}
                          >
                            <span className="text-xs truncate text-muted-foreground max-w-[150px]">{item.msg}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{item.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────── */}
        <section id="features" className="py-20 sm:py-28 border-t border-border/60 relative">
          <div className="page-container">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Everything you need for AI-powered support
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
                A unified customer support autopilot platform designed to train on your existing documents, resolve customer tickets, and assist your support agents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border bg-card/45 p-6 hover:bg-card/75 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative"
                >
                  <div className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl pointer-events-none shadow-primary/5")} />

                  <div className={cn("inline-flex p-3 rounded-xl mb-5 transition-transform group-hover:scale-110", f.bg)}>
                    <f.icon className={cn("h-6 w-6", f.color)} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─────────────────────────────────── */}
        <section id="how-it-works" className="py-20 sm:py-28 border-t border-border/60 bg-muted/20 relative">
          <div className="page-container">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Up and running in 3 steps
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mt-4">
                Deploy a highly customized conversational AI in minutes. No AI or ML experience needed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 max-w-5xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.num} className="relative text-center group">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                  <div className="inline-flex h-20 w-20 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-primary/10 transition-all duration-300">
                    <span className="text-2xl font-extrabold text-primary">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ──────────────────────────────────────── */}
        <section id="pricing" className="py-20 sm:py-28 border-t border-border/60">
          <div className="page-container">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mt-4">
                Start for free. Grow at your own pace. Switch plans at any time.
              </p>
            </div>

            {/* Billing toggle switcher */}
            <div className="flex items-center justify-center gap-3 mb-12 sm:mb-16">
              <span className={cn("text-sm font-semibold transition-colors", !isAnnual ? "text-foreground" : "text-muted-foreground")}>Monthly billing</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted/80 hover:bg-muted transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Toggle annual billing discount"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-primary shadow-lg ring-0 transition duration-200 ease-in-out",
                    isAnnual ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className={cn("text-sm font-semibold flex items-center gap-1.5 transition-colors", isAnnual ? "text-foreground" : "text-muted-foreground")}>
                Annual billing
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-500">
                  Save 20%
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
              {plans.map((plan) => {
                const isFree = plan.monthlyPrice === 0;
                const isEnterprise = plan.monthlyPrice === -1;
                const activePrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;

                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative rounded-2xl border bg-card/50 p-6 flex flex-col transition-all duration-300 hover:shadow-xl",
                      plan.popular
                        ? "border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20 bg-card/85 -translate-y-1 sm:-translate-y-2 hover:-translate-y-3"
                        : "border-border hover:-translate-y-1"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25">
                          <Sparkles className="h-3 w-3" /> Most Popular
                        </span>
                      </div>
                    )}
                    <div className="mb-5">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.desc}</p>
                    </div>
                    <div className="mb-6 flex items-baseline">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {isFree ? "Free" : isEnterprise ? "Custom" : `$${activePrice}`}
                      </span>
                      {!isFree && !isEnterprise && (
                        <span className="text-sm font-semibold text-muted-foreground ml-1">/mo</span>
                      )}
                    </div>
                    
                    <div className="h-px bg-border/60 w-full mb-6" />

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm">
                          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.href}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full",
                        plan.popular
                          ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20"
                          : "border border-border bg-background/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────── */}
        <section className="py-20 sm:py-28 border-t border-border/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] bg-gradient-to-t from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="page-container text-center relative z-10">
            <div className="max-w-3xl mx-auto rounded-3xl border border-border/80 bg-card/45 backdrop-blur-md p-8 sm:p-12 lg:p-16 space-y-6 sm:space-y-8 shadow-xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                Ready to transform your support?
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Join 2,000+ support teams using SupportPilot to deliver instant, accurate answers and automate operations with AI.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                <Link
                  href="/sign-up"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border bg-background/50 backdrop-blur-sm font-semibold hover:bg-accent hover:text-foreground transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10 sm:py-14 relative z-10 bg-background/30 backdrop-blur-sm">
        <div className="page-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Rocket className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight">SupportPilot</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-medium">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">Documentation</a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">System Status</a>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SupportPilot Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
