"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Detect scroll to style header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Body scroll lock when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Focus trap within mobile menu
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !menuRef.current) return;

      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    []
  );

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className={cn(
      "sticky top-0 z-sticky transition-all duration-300 border-b border-transparent bg-transparent",
      scrolled && "border-border/80 bg-background/80 glass shadow-sm shadow-primary/5"
    )}>
      {/* Skip navigation link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-1 focus:left-1 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
      >
        Skip to main content
      </a>
      <div className="page-container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo size="sm" showLabel={false} className="group-hover:scale-105 transition-transform" />
          <span className="text-lg font-bold tracking-tight">SupportPilot</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" aria-label="Main navigation">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5">
            Sign In
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          ref={buttonRef}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="md:hidden border-t border-border bg-background/95 glass animate-slide-down"
          onKeyDown={handleMenuKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav className="page-container flex flex-col py-3 space-y-1" aria-label="Mobile navigation">
            <a href="#features" onClick={closeMenu} className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">Features</a>
            <a href="#how-it-works" onClick={closeMenu} className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">How It Works</a>
            <a href="#pricing" onClick={closeMenu} className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">Pricing</a>
            <div className="border-t border-border pt-2 mt-2 flex flex-col gap-2">
              <Link href="/sign-in" onClick={closeMenu} className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">Sign In</Link>
              <Link href="/sign-up" onClick={closeMenu} className="mx-3 py-2.5 text-sm font-medium text-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Get Started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
