"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listOrganizers } from "@/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { OrganizerViewDialog } from "@/components/organizer-view-dialog";
import { me } from "@/lib/auth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Organizer } from "@/client/types.gen";

export default function OrganizersPage() {
  const { data: meData } = useQuery({ queryKey: ["auth", "me"], queryFn: me });
  const userId = meData?.id as number | undefined;
  const { data, isLoading, error } = useQuery({ queryKey: ["organizers"], queryFn: () => listOrganizers() });
  const organizers: Organizer[] = (data?.data ?? []) as Organizer[];
  const [viewing, setViewing] = useState<Organizer | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Vereine</h1>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Vereine</h2>
        {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`org-skeleton-${Date.now()}-${idx}`} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
        ) : error ? (
        <p className="text-destructive">Fehler beim Laden der Vereine</p>
        ) : (
        <>
          {/* Your organizer first with edit only */}
          {organizers.find((o) => o.id === userId) && (
            <div className="space-y-2">
              <h2 className="text-sm uppercase text-muted-foreground">Dein Verein</h2>
              {organizers.filter((o) => o.id === userId).map((o) => (
                <Card key={o.id} >
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {o.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Link href={`/organizers/${o.id}`}>
                        <Button size="sm" variant="outline">
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p className="line-clamp-3">{o.description_de || o.description_en || "No description"}</p>
                    <div className="text-xs flex gap-3">
                      {o.website_url ? (
                        <a href={o.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website</a>
                      ) : <span className="text-muted-foreground">No website</span>}
                      {o.instagram_url ? (
                        <a href={o.instagram_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Instagram</a>
                      ) : <span className="text-muted-foreground">No Instagram</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* Other organizers as clickable cards for details */}
          <h2 className="text-sm uppercase text-muted-foreground">Andere Vereine</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizers.filter((o) => o.id !== userId).map((o) => (
              <Card key={o.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(o)}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">{o.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p className="line-clamp-3">{o.description_de || o.description_en || "No description"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
        )}
        <OrganizerViewDialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} organizer={viewing} />
      </div>
    </div>
  );
}
