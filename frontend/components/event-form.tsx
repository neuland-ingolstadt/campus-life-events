"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// removed unused date-fns import

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import RequiredLabel from "./ui/required-label";
import DateTimeField from "@/components/ui/datetime-field";
import type { Event, CreateEventRequest, UpdateEventRequest } from "@/client/types.gen";

const eventSchema = z.object({
  title_de: z.string().min(1, "German title is required"),
  title_en: z.string().min(1, "English title is required"),
  description_de: z.string().optional(),
  description_en: z.string().optional(),
  start_date_time: z.date({ message: "Start date is required" }),
  end_date_time: z.date().optional(),
  event_url: z.string().url().optional().or(z.literal("")),
  publish_app: z.boolean(),
  publish_newsletter: z.boolean(),
  audit_note: z.string().optional(),
});

export type EventFormValues = z.infer<typeof eventSchema>;

export function EventForm({
  event,
  onSave,
  isLoading = false,
}: {
  event?: Event | null;
  onSave: (data: CreateEventRequest | UpdateEventRequest) => Promise<void> | void;
  isLoading?: boolean;
}) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title_de: "",
      title_en: "",
      description_de: "",
      description_en: "",
      start_date_time: new Date(),
      end_date_time: undefined,
      event_url: "",
      publish_app: true,
      publish_newsletter: true,
      audit_note: "",
    },
  });

  useEffect(() => {
    if (event) {
      const startDateTime = new Date(event.start_date_time);
      const endDateTime = event.end_date_time ? new Date(event.end_date_time) : undefined;

      setStartDate(startDateTime);
      setEndDate(endDateTime);
      // time is embedded in the Date object

      form.reset({
        title_de: event.title_de,
        title_en: event.title_en,
        description_de: event.description_de || "",
        description_en: event.description_en || "",
        start_date_time: startDateTime,
        end_date_time: endDateTime,
        event_url: event.event_url || "",
        publish_app: event.publish_app,
        publish_newsletter: event.publish_newsletter,
        audit_note: "",
      });
    } else {
      form.reset({
        title_de: "",
        title_en: "",
        description_de: "",
        description_en: "",
        start_date_time: new Date(),
        end_date_time: undefined,
        event_url: "",
        publish_app: true,
        publish_newsletter: true,
        audit_note: "",
      });
      setStartDate(new Date());
      setEndDate(undefined);
    }
  }, [event, form]);

  const onSubmit = async (values: EventFormValues) => {
    if (!startDate) return;

    const startDateTime = new Date(startDate);
    const endDateTime = endDate ? new Date(endDate) : undefined;

    const payload = {
      ...values,
      start_date_time: startDateTime.toISOString(),
      end_date_time: endDateTime?.toISOString(),
      event_url: values.event_url || undefined,
      description_de: values.description_de || undefined,
      description_en: values.description_en || undefined,
      audit_note: values.audit_note || undefined,
    } as CreateEventRequest | UpdateEventRequest;

    await onSave(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Event Information</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title_de"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    German Title <RequiredLabel />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Event title in German" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    English Title <RequiredLabel />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Event title in English" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Schedule</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateTimeField
              label="Start"
              required
              value={startDate}
              onValueChange={setStartDate}
            />
            <DateTimeField
              label="End"
              value={endDate}
              onValueChange={setEndDate}
              description="Optional. Leave empty if no end time."
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Descriptions</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="description_de"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>German Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Event description in German" className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Event description in English" className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Links & Visibility</h2>
          <div className="mt-3 space-y-6">
            <FormField
              control={form.control}
              name="event_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>Optional link to an external page</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publish_app"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-4">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Publish in app</FormLabel>
                      <FormDescription className="text-xs">Show this event in apps.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publish_newsletter"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-4">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium">Include in newsletter</FormLabel>
                      <FormDescription className="text-xs">Feature this event in the newsletter.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Additional Information</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="audit_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change note</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional note for audit log" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isLoading} size="lg" className="px-8">
            {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
