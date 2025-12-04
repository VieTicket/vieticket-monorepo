"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageCircle, Loader2 } from "lucide-react";
import { getAllActiveOrganizersAction } from "@/lib/actions/admin/organizer-actions";
import { useTranslations } from "next-intl";

interface OrganizerWithUser {
  id: string;
  name: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface AdminNewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminNewChatDialog({
  open,
  onOpenChange,
}: AdminNewChatDialogProps) {
  const [organizers, setOrganizers] = useState<OrganizerWithUser[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<
    OrganizerWithUser[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("admin-dashboard.Chat");

  useEffect(() => {
    if (open) {
      loadOrganizers();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrganizers(organizers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = organizers.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.user.name.toLowerCase().includes(query) ||
          org.user.email.toLowerCase().includes(query)
      );
      setFilteredOrganizers(filtered);
    }
  }, [searchQuery, organizers]);

  const loadOrganizers = async () => {
    setLoading(true);
    try {
      const result = await getAllActiveOrganizersAction();
      console.log("Load organizers result:", result);
      if (result.success && result.data) {
        console.log("Organizers loaded:", result.data.length);
        setOrganizers(result.data);
        setFilteredOrganizers(result.data);
      } else {
        console.error("Failed to load organizers:", result.error);
      }
    } catch (error) {
      console.error("Failed to load organizers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganizer = (organizerId: string) => {
    console.log("Selecting organizer:", organizerId);
    onOpenChange(false);
    router.push(`/admin/chat?recipientId=${organizerId}`);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("select_organizer")}</DialogTitle>
          <DialogDescription>
            {t("select_organizer_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_organizer")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrganizers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? t("no_organizers_found")
                : t("no_active_organizers")}
            </div>
          ) : (
            filteredOrganizers.map((organizer) => (
              <Button
                key={organizer.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3"
                onClick={() => handleSelectOrganizer(organizer.user.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={organizer.user.image || undefined} />
                  <AvatarFallback>
                    {organizer.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{organizer.user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {organizer.user.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {organizer.name}
                  </div>
                </div>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
