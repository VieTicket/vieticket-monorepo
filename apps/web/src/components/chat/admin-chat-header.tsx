"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { AdminNewChatDialog } from "./admin-new-chat-dialog";
import { useTranslations } from "next-intl";

export function AdminChatHeader() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations("admin-dashboard.Chat");

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          {t("new_chat")}
        </Button>
      </div>

      <AdminNewChatDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
