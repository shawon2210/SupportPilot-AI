import Link from "next/link";
import { Logo } from "@/components/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" showLabel={false} />
            <span className="text-lg font-bold">SupportPilot</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          Powered by <span className="font-medium text-foreground">SupportPilot AI</span>
        </div>
      </footer>
    </div>
  );
}
