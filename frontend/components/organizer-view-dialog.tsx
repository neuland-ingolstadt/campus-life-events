"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizer: any | null;
};

export function OrganizerViewDialog({ open, onOpenChange, organizer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{organizer?.name}</DialogTitle>
          <DialogDescription>Organizer details</DialogDescription>
        </DialogHeader>
        {organizer && (
          <div className="space-y-4 text-sm">
            {organizer.description_de && (
              <div>
                <div className="font-medium mb-1">Description (DE)</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{organizer.description_de}</p>
              </div>
            )}
            {organizer.description_en && (
              <div>
                <div className="font-medium mb-1">Description (EN)</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{organizer.description_en}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-1">Website</div>
                {organizer.website_url ? (
                  <a href={organizer.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                    {organizer.website_url}
                  </a>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </div>
              <div>
                <div className="font-medium mb-1">Instagram</div>
                {organizer.instagram_url ? (
                  <a href={organizer.instagram_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                    {organizer.instagram_url}
                  </a>
                ) : (
                  <span className="text-muted-foreground">–</span>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Created: {new Date(organizer.created_at).toLocaleString()} • Updated: {new Date(organizer.updated_at).toLocaleString()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

