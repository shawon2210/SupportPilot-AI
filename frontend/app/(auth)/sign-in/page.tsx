"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore, useWorkspaceStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Schema = z.infer<typeof schema>;

const features = [
  "AI-powered ticket classification",
  "Smart response suggestions",
  "Knowledge base integration",
  "Real-time analytics dashboard",
];

export default function SignInPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const { setWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  const [showPw, setShowPw] = useState(false);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: Schema) => {
    try {
      const res = await api.post<{ access_token: string; token_type: string; user: { id: string; email: string; first_name?: string; last_name?: string } }>("/auth/login", data);
      setToken(res.access_token);
      setUser(res.user);
      api.setToken(res.access_token);

      // Fetch workspaces and auto-select the first one
      try {
        const wsRes = await api.get<{ data: Array<{ id: string; name: string; slug: string; plan: string; is_active: boolean; created_at: string | null }> }>("/workspaces");
        const items = wsRes.data || wsRes || [];
        setWorkspaces(items);
        if (items.length > 0) {
          setCurrentWorkspace(items[0]);
        }
      } catch {
        // Non-critical: workspace fetch failed, user can still navigate
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed. Please check your credentials.";
      toast.error(message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Logo / Brand */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center">
          <Logo size="lg" showLabel={false} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your SupportPilot account</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} type="email" placeholder="you@company.com" className="pl-10 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm">Password</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} type={showPw ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="rounded border-input h-4 w-4" />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me for 30 days</Label>
              </div>

              <Button type="submit" className="w-full h-11 text-sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">or continue with</span>
            </div>
          </div>

          <GoogleSignInButton />
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-2 gap-2">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-primary hover:underline font-medium">
          Create one free
          <ArrowRight className="inline h-3 w-3 ml-1" />
        </Link>
      </p>
    </div>
  );
}
