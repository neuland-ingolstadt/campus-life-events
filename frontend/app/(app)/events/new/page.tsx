"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventForm } from "@/components/event-form";
import { createEvent } from "@/client";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSave(values: any) {
    setSaving(true);
    try {
      await createEvent({ body: values });
      router.push("/events");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/events">Events</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create New Event</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4 mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Create New Event</h1>
          <p className="text-muted-foreground mt-2">Fill out the details below to publish your event.</p>
        </div>
      </div>
      <EventForm onSave={onSave} isLoading={saving} />
    </div>
  );
}
