"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Plus, User } from "lucide-react";

type QuickActionsProps = {
  userEventsCount: number;
  className?: string;
};

export function QuickActions({ userEventsCount, className }: QuickActionsProps) {
  const actions = [
    {
      title: "Neues Event",
      description: "Ein neues Event erstellen",
      icon: Plus,
      href: "/events/new",
    },
    {
      title: "Meine Events",
      description: `${userEventsCount} gesamt`,
      icon: Calendar,
      href: "/events",
    },
    {
      title: "Vereins Profil",
      description: "Vereins Profil verwalten",
      icon: User,
      href: "/organizers",
    },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link key={action.title} href={action.href} className="block">
            <Card className="cursor-pointer transition-all hover:shadow-sm active:scale-[0.99]">
              <CardContent className="px-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-muted text-primary ring-1 ring-border/50 h-9 w-9 flex items-center justify-center">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;


