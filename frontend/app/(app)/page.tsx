"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Clock, Plus, AlertTriangle, ExternalLink, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { listEvents, listOrganizers } from "@/client";
import { me } from "@/lib/auth";
import Link from "next/link";
import QuickActions from "@/components/quick-actions";

export default function Dashboard() {
  const { data: user } = useQuery({ queryKey: ["auth", "me"], queryFn: me });
  const { data: events, isLoading: eventsLoading } = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const { data: organizers } = useQuery({ queryKey: ["organizers"], queryFn: () => listOrganizers() });

  const now = new Date();
  const allEvents = events?.data ?? [];
  const upcomingEvents = allEvents.filter((e: any) => new Date(e.start_date_time) > now).sort((a: any, b: any) => new Date(a.start_date_time).getTime() - new Date(b.start_date_time).getTime());
  const nextEvent = upcomingEvents[0];
  const recentEvents = allEvents.filter((e: any) => new Date(e.start_date_time) <= now).slice(0, 5);

  const orgMap = new Map<number, string>(
    (organizers?.data ?? []).map((o: any) => [o.id as number, o.name as string])
  );

  // Get current user's organizer profile
  const currentUserOrganizer = organizers?.data?.find((o: any) => o.id === user?.id);
  
  // Check if organizer profile is incomplete
  const isProfileIncomplete = currentUserOrganizer && (
    !currentUserOrganizer.description_de && 
    !currentUserOrganizer.description_en ||
    !currentUserOrganizer.website_url
  );

  // Get user's events
  const userEvents = allEvents.filter((e: any) => e.organizer_id === user?.id);
  const userUpcomingEvents = userEvents.filter((e: any) => new Date(e.start_date_time) > now);
  const userPublishedEvents = userEvents.filter((e: any) => e.publish_app);

  // Quick actions moved to dedicated component

  const stats = [
    { title: "Deine Events", value: userEvents.length || 0, icon: Calendar, description: "Events, die du erstellt hast" },
    { title: "Anstehende Events", value: userUpcomingEvents.length, icon: Clock, description: "Events, die du erstellt hast und anstehen" },
    { title: "Veröffentlicht", value: userPublishedEvents.length, icon: TrendingUp, description: "Live in the app" },
    { title: "Alle Vereine", value: organizers?.data?.length || 0, icon: Users, description: "Alle Vereine" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{user ? `Willkommen zurück, ${user.name}` : "Willkommen"}</h2>
            <p className="text-muted-foreground mt-1">Verwalte deine Events und dein Vereinsprofil</p>
          </div>
        </div>

        {isProfileIncomplete && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Verein Profil vervollständigen</h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Dein Verein ist noch nicht vollständig. Bitte fülle alle Felder aus, um dein Profil zu vervollständigen.
                </p>
                <div className="mt-3">
                  <Link href="/organizers">
                    <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Anpassen
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <QuickActions userEventsCount={userEvents.length} />
        </div>



  

        <div className="space-y-4"> 
        <h3 className="text-lg font-semibold">Übersicht</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>

        {/* Your Events */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Deine anstehenden   Events</CardTitle>
              <CardDescription>Events, die du erstellt hast und anstehen</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={`upcoming-skeleton-${Date.now()}-${i}`} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : userUpcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Keine anstehenden Events</p>
                  <Link href="/events/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Erstelle dein erstes Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userUpcomingEvents.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{event.title_de}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_date_time), "PPpp")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={event.publish_app ? "default" : "secondary"}>
                          {event.publish_app ? "Published" : "Draft"}
                        </Badge>
                        <Link href={`/events/${event.id}`}>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Aktivitäten</CardTitle>
              <CardDescription>Deine letzten Events und Updates</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={`recent-skeleton-${Date.now()}-${i}`} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-center py-6">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Keine Events noch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userEvents.slice(0, 4).map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none line-clamp-1">{event.title_de}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.start_date_time), "MMM d")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.publish_app ? "Live" : "Draft"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
