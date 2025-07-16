"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Download, Star } from "lucide-react";
import { toast } from "sonner";
import {
  getPublicSeatMapsAction,
  createDraftFromPublicSeatMapAction,
} from "@/lib/actions/organizer/seat-map-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PublicSeatMapItem = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
};

interface TemplatesDialogProps {
  children: React.ReactNode;
  onDraftCreated?: () => void;
}

export function TemplatesDialog({
  children,
  onDraftCreated,
}: TemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publicSeatMaps, setPublicSeatMaps] = useState<PublicSeatMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState<string | null>(null);

  const loadPublicSeatMaps = async (query?: string) => {
    try {
      setIsLoading(true);
      const result = await getPublicSeatMapsAction(1, 20, query);

      if (result.success) {
        setPublicSeatMaps(result.data.seatMaps);
      } else {
        toast.error(result.error || "Failed to load public seat maps");
      }
    } catch (error) {
      console.error("Error loading public seat maps:", error);
      toast.error("An unexpected error occurred while loading templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPublicSeatMaps();
    }
  }, [open]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        loadPublicSeatMaps(searchQuery || undefined);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  const handleCreateDraft = async (seatMap: PublicSeatMapItem) => {
    try {
      setIsCreatingDraft(seatMap.id);
      const draftName = `Draft of ${seatMap.name}`;

      const result = await createDraftFromPublicSeatMapAction(
        seatMap.id,
        draftName
      );

      if (result.success) {
        toast.success(`Draft "${draftName}" created successfully!`);
        setOpen(false);
        onDraftCreated?.();
      } else {
        toast.error(result.error || "Failed to create draft");
      }
    } catch (error) {
      console.error("Error creating draft:", error);
      toast.error("An unexpected error occurred while creating draft");
    } finally {
      setIsCreatingDraft(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Browse Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />
            <Input
              placeholder="Search public seat map templates..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : publicSeatMaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicSeatMaps.map((seatMap) => (
                  <Card key={seatMap.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                      <img
                        src={seatMap.image || placeholderImage}
                        alt={seatMap.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate mb-1">
                        {seatMap.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>
                          By: {seatMap.originalCreator || seatMap.createdBy}
                        </span>
                        {seatMap.draftCount && seatMap.draftCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {seatMap.draftCount} drafts
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Updated: {formatDate(seatMap.updatedAt)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            window.open(
                              `/seat-map?id=${seatMap.id}&preview=true`,
                              "_blank"
                            )
                          }
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCreateDraft(seatMap)}
                          disabled={isCreatingDraft === seatMap.id}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          {isCreatingDraft === seatMap.id
                            ? "Creating..."
                            : "Use Template"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? "No templates match your search"
                    : "No public templates available"}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
