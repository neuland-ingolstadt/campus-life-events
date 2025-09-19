"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createOrganizer } from "@/client";
import { OrganizerForm } from "@/components/organizer-form";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function NewOrganizerPage() {
  const router = useRouter();
  const qc = useQueryClient();

  async function onSave(values: unknown) {
    await createOrganizer({ body: values });
    await qc.invalidateQueries({ queryKey: ["organizers"] });
    router.push("/organizers");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">New Organizer</h1>
        </div>
      </header>
      <div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
        <OrganizerForm onSave={onSave} />
      </div>
    </div>
  );
}


