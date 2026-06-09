import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminApi } from "@/lib/adminApi";
import { isAuthOrForbiddenError } from "@/lib/adminAuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Mail,
  Activity,
  Leaf,
  LogOut,
  ExternalLink,
  Settings,
} from "lucide-react";

interface Stats {
  users: number;
  subscribers: number;
  events: number;
  forecastClicks: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  page_path: string | null;
  created_at: string;
}

interface TopPage {
  page: string;
  count: number;
}

export default function AdminDashboard() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { run } = useAdminApi();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    users: 0,
    subscribers: 0,
    events: 0,
    forecastClicks: 0,
  });
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setCheckingRole(false);
      return;
    }
    (async () => {
      const { data, error } = await run(
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle(),
      );
      if (error && !isAuthOrForbiddenError(error)) toast.error("Could not verify admin access");
      setIsAdmin(!!data);
      setCheckingRole(false);
    })();
  }, [session, authLoading, run]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const [usersRes, subsRes, eventsRes, forecastRes, recentRes, pagesRes] =
          await Promise.all([
            run(supabase.from("profiles").select("*", { count: "exact", head: true })),
            run(supabase
              .from("newsletter_subscribers")
              .select("*", { count: "exact", head: true })),
            run(supabase
              .from("analytics_events")
              .select("*", { count: "exact", head: true })),
            run(supabase
              .from("analytics_events")
              .select("*", { count: "exact", head: true })
              .eq("event_type", "forecast_button_click")),
            run(supabase
              .from("analytics_events")
              .select("id,event_type,page_path,created_at")
              .order("created_at", { ascending: false })
              .limit(8)),
            run(supabase
              .from("analytics_events")
              .select("page_path")
              .not("page_path", "is", null)
              .order("created_at", { ascending: false })
              .limit(500)),
          ]);

        const firstError = [usersRes, subsRes, eventsRes, forecastRes, recentRes, pagesRes]
          .map((r) => r.error)
          .find(Boolean);
        if (firstError) {
          if (isAuthOrForbiddenError(firstError)) return;
          toast.error((firstError as { message?: string }).message ?? "Failed to load dashboard");
          return;
        }

        setStats({
          users: (usersRes as { count?: number }).count ?? 0,
          subscribers: (subsRes as { count?: number }).count ?? 0,
          events: (eventsRes as { count?: number }).count ?? 0,
          forecastClicks: (forecastRes as { count?: number }).count ?? 0,
        });
        setRecent((recentRes.data as RecentEvent[] | null) ?? []);

        const counts = new Map<string, number>();
        ((pagesRes.data as { page_path: string | null }[] | null) ?? []).forEach((r) => {
          if (!r.page_path) return;
          counts.set(r.page_path, (counts.get(r.page_path) ?? 0) + 1);
        });
        setTopPages(
          Array.from(counts.entries())
            .map(([page, count]) => ({ page, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, run]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Admins only</h1>
          <p className="text-muted-foreground mb-6">
            Your account does not have admin permissions.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
            <Button onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Registered Users", value: stats.users, icon: Users },
    { label: "Newsletter Subscribers", value: stats.subscribers, icon: Mail },
    { label: "Analytics Events", value: stats.events, icon: Activity },
    { label: "Forecast Clicks", value: stats.forecastClicks, icon: Leaf },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <div className="flex items-center justify-between mb-2">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to site
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform activity and engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{value.toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topPages.map((p) => {
                    const max = topPages[0].count || 1;
                    return (
                      <li key={p.page} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium truncate">{p.page}</span>
                          <span className="text-muted-foreground">{p.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(p.count / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ul className="divide-y">
                  {recent.map((e) => (
                    <li key={e.id} className="py-2 text-sm flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.event_type}</div>
                        {e.page_path && (
                          <div className="text-muted-foreground text-xs truncate">
                            {e.page_path}
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/subscribers">
                <Mail className="h-4 w-4 mr-2" /> Newsletter Subscribers
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/settings">
                <Settings className="h-4 w-4 mr-2" /> Admin Settings
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
