/**
 * Draft Recovery Dialog Component
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, FileText, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import type { EventDraftData } from "@/lib/utils/draft-storage";

interface DraftRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftData: EventDraftData | null;
  onRestore: () => void;
  onDiscard: () => void;
  t: (key: string) => string;
}

export function DraftRecoveryDialog({
  open,
  onOpenChange,
  draftData,
  onRestore,
  onDiscard,
  t,
}: DraftRecoveryDialogProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!draftData) return null;

  const formatLastSaved = (timestamp: number) => {
    if (!isClient) return "Lưu lần cuối";

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} ${days === 1 ? "ngày" : "ngày"} trước`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? "giờ" : "giờ"} trước`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? "phút" : "phút"} trước`;
    } else {
      return "Vừa xong";
    }
  };
  const getDraftPreview = () => {
    const previews = [];

    if (draftData.formData.name) {
      previews.push(`Tên sự kiện: "${draftData.formData.name}"`);
    }

    if (draftData.formData.location) {
      previews.push(`Địa điểm: "${draftData.formData.location}"`);
    }

    if (draftData.showings.some((s) => s.startTime)) {
      const validShowings = draftData.showings.filter((s) => s.startTime);
      previews.push(`${validShowings.length} buổi biểu diễn`);
    }

    if (draftData.step > 1) {
      previews.push(`Đã hoàn thành bước ${draftData.step}/4`);
    }

    return previews;
  };

  const draftPreview = getDraftPreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {draftData.isEditing
              ? "Khôi phục bản nháp chỉnh sửa"
              : "Khôi phục bản nháp"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                Chúng tôi đã tìm thấy một bản nháp từ lần truy cập trước của
                bạn. Bạn có muốn khôi phục nó không?
              </p>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Lưu lần cuối: {formatLastSaved(draftData.lastSaved)}
                  </span>
                </div>

                {draftPreview.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-700">
                      Nội dung đã nhập:
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {draftPreview.map((preview, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                          <span>{preview}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-amber-600">
                ⚠️ Chọn "Bỏ qua" sẽ xóa vĩnh viễn bản nháp này và bắt đầu lại từ
                đầu.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="w-full sm:w-auto"
          >
            Bỏ qua
          </Button>
          <Button onClick={onRestore} className="w-full sm:w-auto">
            Khôi phục bản nháp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
