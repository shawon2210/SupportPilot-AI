"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User, Mail, Loader2, Save, Shield, AtSign, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores";
import { getInitials } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
});
type Schema = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: user?.first_name || "", last_name: user?.last_name || "", email: user?.email || "" },
  });

  const onSubmit = async (data: Schema) => {
    setLoading(true);
    try {
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account information</p>
        </div>

        {/* Skeleton Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and preferences</p>
      </div>

      {/* Profile Card with Gradient Header */}
      <Card className="overflow-hidden animate-fade-up" style={{ animationDelay: "50ms" }}>
        {/* Gradient Banner */}
        <div className="h-24 sm:h-28 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        </div>

        {/* Avatar + Info */}
        <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-10 sm:-mt-12 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            {/* Avatar */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-2xl sm:text-3xl font-bold text-primary-foreground ring-4 ring-background shadow-lg">
              {getInitials(user?.first_name + " " + user?.last_name)}
            </div>

            {/* Name + Email */}
            <div className="text-center sm:text-left pb-1 flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold truncate">
                {user?.first_name} {user?.last_name}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <CardHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">Update your name and email address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  First Name
                </label>
                <Input
                  {...register("first_name")}
                  placeholder="Enter first name"
                  className="h-10 text-sm"
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Last Name
                </label>
                <Input
                  {...register("last_name")}
                  placeholder="Enter last name"
                  className="h-10 text-sm"
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address
              </label>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="h-10 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Divider + Actions */}
            <div className="pt-1 sm:pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                className="h-10 text-sm active:scale-[0.97] transition-transform"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !isDirty}
                className="h-10 text-sm active:scale-[0.97] transition-transform"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card className="animate-fade-up" style={{ animationDelay: "150ms" }}>
        <CardHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Account Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">Read-only account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">User ID</p>
              <p className="text-sm font-mono truncate">{user?.id || "—"}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</p>
              <p className="text-sm truncate">{user?.first_name} {user?.last_name}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-sm truncate">{user?.email || "—"}</p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs font-medium mt-0.5">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
