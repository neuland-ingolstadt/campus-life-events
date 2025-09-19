"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Organizer, CreateOrganizerRequest, UpdateOrganizerRequest } from "@/client/types.gen";

const organizerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description_de: z.string().optional(),
  description_en: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  instagram_url: z.string().url().optional().or(z.literal("")),
});

type OrganizerFormValues = z.infer<typeof organizerSchema>;

interface OrganizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizer?: Organizer | null;
  onSave: (data: CreateOrganizerRequest | UpdateOrganizerRequest) => void;
  isLoading?: boolean;
}

export function OrganizerDialog({
  open,
  onOpenChange,
  organizer,
  onSave,
  isLoading = false,
}: OrganizerDialogProps) {
  const form = useForm<OrganizerFormValues>({
    resolver: zodResolver(organizerSchema),
    defaultValues: {
      name: "",
      description_de: "",
      description_en: "",
      website_url: "",
      instagram_url: "",
    },
  });

  useEffect(() => {
    if (organizer) {
      form.reset({
        name: organizer.name,
        description_de: organizer.description_de || "",
        description_en: organizer.description_en || "",
        website_url: organizer.website_url || "",
        instagram_url: organizer.instagram_url || "",
      });
    } else {
      form.reset({
        name: "",
        description_de: "",
        description_en: "",
        website_url: "",
        instagram_url: "",
      });
    }
  }, [organizer, form]);

  const onSubmit = (values: OrganizerFormValues) => {
    const organizerData = {
      ...values,
      website_url: values.website_url || undefined,
      instagram_url: values.instagram_url || undefined,
      description_de: values.description_de || undefined,
      description_en: values.description_en || undefined,
    };

    onSave(organizerData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {organizer ? "Edit Organizer" : "Create New Organizer"}
          </DialogTitle>
          <DialogDescription>
            {organizer ? "Update the organizer details below." : "Fill in the details to create a new organizer."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Organizer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description_de"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>German Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description in German" {...field} />
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
                      <Textarea placeholder="Description in English" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional website URL for the organizer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/username" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional Instagram profile URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : organizer ? "Update Organizer" : "Create Organizer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
