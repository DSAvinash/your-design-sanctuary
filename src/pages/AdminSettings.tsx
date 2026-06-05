import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export default function AdminSettings() {
  const { session, loading: authLoading } = useAuth();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setCheckingRole(false);
      return;
    }
    setCurrentEmail(session.user.email ?? "");
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setCheckingRole(false);
    })();
  }, [session, authLoading]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !password) {
      toast.error("Enter a new email and your current password");
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("New email must be different from current email");
      return;
    }
    setSaving(true);
    try {
      // Reauthenticate by signing in again with current credentials
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      });
      if (reauthError) {
        toast.error("Password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        "Email update requested. Check the new inbox to confirm if verification is required.",
      );
      setPassword("");
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update email");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 md:p-10">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-1">Admin Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your admin account.</p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" /> Admin Email
            </CardTitle>
            <CardDescription>
              Update the email used to sign in. Your current password is required to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-email">Current email</Label>
                <Input id="current-email" type="email" value={currentEmail} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="new-admin@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Confirm with current password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Update email"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
