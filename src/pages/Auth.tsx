import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Auth() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate("/", { replace: true });
  }, [authLoading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/");
      } else {
        if (password.length < 6) {
          toast({ title: "Password must be at least 6 characters", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email } },
        });
        if (error) throw error;
        toast({ title: "Account created! You're now logged in." });
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: err.message ?? "Authentication failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-secondary-container/30 via-transparent to-primary/10" />

      {/* Card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/80 p-8 shadow-[0_24px_60px_rgba(40,45,26,0.12)] backdrop-blur-xl md:p-10">
        <h1 className="font-headline text-3xl font-bold text-primary">
          {isLogin ? "Welcome 👋" : "Join us 🌱"}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {isLogin
            ? "Login to access your AgroVision AI account"
            : "Create your AgroVision AI account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm text-on-surface-variant">
                Name
              </Label>
              <Input
                id="displayName"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-full border-outline-variant/40 bg-surface-container-lowest py-5 px-5 shadow-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-on-surface-variant">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="hello@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border-outline-variant/40 bg-surface-container-lowest py-5 px-5 shadow-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-on-surface-variant">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border-outline-variant/40 bg-surface-container-lowest py-5 px-5 shadow-none"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-6 text-base font-semibold"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? "Login" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}