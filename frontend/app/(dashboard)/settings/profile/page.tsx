"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { User, Mail, Loader2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores";
import { getInitials } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

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
      console.log("Update profile:", data);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your account information</p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-14 w-14 sm:h-16 sm:w-16 rounded-full" />
            <Skeleton className="h-4 w-28 sm:w-32" />
            <Skeleton className="h-4 w-40 sm:w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your account information</p>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center text-lg sm:text-xl font-bold text-primary">
            {getInitials(user?.first_name + " " + user?.last_name)}
          </div>
          <div className="text-center sm:text-left">
            <p className="font-medium text-sm sm:text-base">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">First Name</label>
                <Input {...register("first_name")} className="h-9 sm:h-10 text-sm sm:text-base" />
                {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">Last Name</label>
                <Input {...register("last_name")} className="h-9 sm:h-10 text-sm sm:text-base" />
                {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5">Email</label>
              <Input {...register("email")} type="email" className="h-9 sm:h-10 text-sm sm:text-base" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <Button type="submit" disabled={loading || !isDirty} className="h-9 sm:h-10 text-sm sm:text-base w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
