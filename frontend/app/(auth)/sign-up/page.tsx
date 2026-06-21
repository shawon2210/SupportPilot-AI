"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8),
}).refine((d) => d.password === d.confirm_password, { message: "Passwords don't match", path: ["confirm_password"] });
type Schema = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { setIsLoading(false); }, []);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "", confirm_password: "" },
  });

  const onSubmit = async (data: Schema) => {
    try {
      const res = await api.post<{ access_token: string; token_type: string; user: { id: string; email: string; first_name?: string; last_name?: string } }>("/auth/register", {
        email: data.email, password: data.password, first_name: data.first_name, last_name: data.last_name,
      });
      setToken(res.access_token);
      setUser(res.user);
      api.setToken(res.access_token);
      toast.success("Account created!");
      router.push("/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed. Please try again.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
          <Skeleton className="h-7 w-64 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Logo / Brand */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center">
          <Logo size="lg" showLabel={false} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start your free trial — no credit card required</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="first_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">First Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="John" className="pl-10 h-11" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="last_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Doe" className="h-11" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />
              </div>

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
                  <FormLabel className="text-sm">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} type={showPw ? "text" : "password"} placeholder="Min 8 characters" className="pl-10 pr-10 h-11" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} type={showPw ? "text" : "password"} placeholder="Repeat password" className="pl-10 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-11 text-sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <>
                    Create Account
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

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary hover:underline font-medium">
          Sign in
          <ArrowRight className="inline h-3 w-3 ml-1" />
        </Link>
      </p>
    </div>
  );
}
