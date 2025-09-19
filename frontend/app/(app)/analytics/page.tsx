"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs, listEvents, listOrganizers } from "@/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";

const COLORS = {
  CREATE: "hsl(var(--chart-1))",
  UPDATE: "hsl(var(--chart-2))",
  DELETE: "hsl(var(--chart-3))",
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");

  const { data: logsData, isLoading: _logsLoading } = useQuery({
    queryKey: ["audit-logs", days],
    queryFn: () => listAuditLogs({ query: { limit: 5000 } }),
  });
  const { data: eventsData } = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const { data: orgsData } = useQuery({ queryKey: ["organizers"], queryFn: () => listOrganizers() });

  const events = eventsData?.data ?? [];
  const orgs = orgsData?.data ?? [];
  const orgMap = useMemo(() => new Map((orgs ?? []).map((o: any) => [o.id as number, o.name as string])), [orgs]);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const filtered = useMemo(() => {
    let rows = (logsData?.data ?? []).filter((r: any) => new Date(r.at) >= since);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r: any) => {
        const ev = events.find((e: any) => e.id === r.event_id);
        const orgName = orgMap.get(r.organizer_id) ?? "";
        return (
          String(r.event_id).includes(q) ||
          ev?.title_de?.toLowerCase().includes(q) ||
          ev?.title_en?.toLowerCase().includes(q) ||
          orgName.toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [logsData, since, search, events, orgMap]);

  const timeline = useMemo(() => {
    const buckets = new Map<string, { date: string; CREATE: number; UPDATE: number; DELETE: number }>();
    for (const r of filtered) {
      const d = format(new Date(r.at), "yyyy-MM-dd");
      if (!buckets.has(d)) buckets.set(d, { date: d, CREATE: 0, UPDATE: 0, DELETE: 0 });
      const b = buckets.get(d)!;
      b[r.type as "CREATE" | "UPDATE" | "DELETE"]++;
    }
    return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const byType = useMemo(() => {
    const acc = { CREATE: 0, UPDATE: 0, DELETE: 0 } as Record<string, number>;
    for (const r of filtered) acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, [filtered]);

  const byEvent = useMemo(() => {
    const acc = new Map<number, number>();
    for (const r of filtered) acc.set(r.event_id, (acc.get(r.event_id) || 0) + 1);
    return Array.from(acc.entries())
      .map(([id, count]) => ({ id, count, title: events.find((e: any) => e.id === id)?.title_de || `Event #${id}` }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered, events]);

  const total = filtered.length;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Analytics</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground">Audit log insights from the last {days} days</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input placeholder="Search events/organizers" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
            <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total changes</CardDescription><CardTitle className="text-2xl">{total}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Creates</CardDescription><CardTitle className="text-2xl">{byType.CREATE || 0}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Updates</CardDescription><CardTitle className="text-2xl">{byType.UPDATE || 0}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Deletes</CardDescription><CardTitle className="text-2xl">{byType.DELETE || 0}</CardTitle></CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline line chart */}
        <Card>
          <CardHeader>
            <CardTitle>Changes over time</CardTitle>
            <CardDescription>Daily volume grouped by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ CREATE: { label: "Create", color: COLORS.CREATE }, UPDATE: { label: "Update", color: COLORS.UPDATE }, DELETE: { label: "Delete", color: COLORS.DELETE } }}
              className="h-72"
            >
              <LineChart data={timeline} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "MM/dd")} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="CREATE" stroke={COLORS.CREATE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="UPDATE" stroke={COLORS.UPDATE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="DELETE" stroke={COLORS.DELETE} strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top changed events */}
        <Card>
          <CardHeader>
            <CardTitle>Top changed events</CardTitle>
            <CardDescription>Most activity in the period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ count: { label: "Changes", color: "hsl(var(--chart-4))" } }}
              className="h-72"
            >
              <BarChart data={byEvent} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="title" tickLine={false} axisLine={false} interval={0} angle={-20} height={70} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
