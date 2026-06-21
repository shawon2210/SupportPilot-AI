"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});
type Schema = z.infer<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { addWorkspace } = useWorkspaceStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const name = form.watch("name");
  const [manualSlug, setManualSlug] = useState(false);

  useEffect(() => {
    if (!manualSlug && name) form.setValue("slug", slugify(name), { shouldValidate: true });
  }, [name, manualSlug, form]);

  const onSubmit = async (data: Schema) => {
    try {
      const result = await api.post<{ id: string; name: string; slug: string; plan: string; is_active: boolean; created_at: string | null }>("/workspaces", { name: data.name, slug: data.slug });
      addWorkspace({ id: result.id, name: result.name, slug: result.slug, plan: result.plan, is_active: result.is_active, created_at: result.created_at });
      toast.success("Workspace created!");
      setStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create workspace.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 justify-center mb-8">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Skeleton className="h-2 w-12 rounded-full" />
            <Skeleton className="h-2 w-12 rounded-full" />
            <Skeleton className="h-2 w-12 rounded-full" />
          </div>
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
              <Skeleton className="h-10 w-40 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-8 bg-background">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Logo size="lg" showLabel={false} />
          <span className="text-2xl font-bold">SupportPilot</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 w-12 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome to SupportPilot</h2>
              <p className="text-muted-foreground mb-8">Let&apos;s set up your first workspace. This takes about 2 minutes.</p>
              <Button onClick={() => setStep(2)} className="w-full sm:w-auto">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Create your workspace</h2>
                <p className="text-muted-foreground">Your workspace is where your team manages AI support.</p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Acme Corp Support" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace URL</FormLabel>
                      <FormControl>
                        <div className="flex items-center rounded-md border border-input bg-background overflow-hidden">
                          <span className="px-3 text-sm text-muted-foreground bg-muted border-r border-input py-2.5">supportpilot.app/</span>
                          <input {...field} onFocus={() => setManualSlug(true)} placeholder="acme-corp" className="flex-1 px-4 py-2.5 text-sm bg-transparent focus:outline-none border-0" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <Badge variant="secondary">Free Plan</Badge>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 2 team members</li><li>• 10 documents</li><li>• 50 messages/day</li><li>• 100MB storage</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={!form.formState.isValid || form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Create Workspace
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
              <p className="text-muted-foreground mb-8">Your workspace is ready. Start uploading documents or chatting with your AI agent.</p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
