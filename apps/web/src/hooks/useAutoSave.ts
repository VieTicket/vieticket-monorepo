/**
 * Custom hook for auto-saving event creation form data
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveDraft,
  getDraft,
  clearDraft,
  hasDraft,
  hasMeaningfulContent,
  type EventDraftData,
} from "@/lib/utils/draft-storage";
import type {
  EventFormData,
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
} from "@/types/event-types";
import type { ShowingWithAreas } from "@/types/showings";

export type SaveStatus = "saved" | "saving" | "error" | "idle";

interface UseAutoSaveProps {
  formData: EventFormData;
  areas: Area[];
  showings: ShowingWithAreas[];
  ticketingMode: TicketingMode;
  selectedSeatMap?: string;
  selectedSeatMapData?: SeatMapData | null;
  seatMapPreviewData?: SeatMapPreviewData | null;
  step: number;
  posterPreview?: string | null;
  bannerPreview?: string | null;
  eventId?: string | null;
  autoSaveEnabled?: boolean;
  saveInterval?: number; // milliseconds
}

interface UseAutoSaveReturn {
  hasSavedDraft: boolean;
  loadDraft: () => EventDraftData | null;
  clearSavedDraft: () => void;
  forceSave: () => void;
  saveStatus: SaveStatus;
  lastSaved: number | null;
}

export function useAutoSave({
  formData,
  areas,
  showings,
  ticketingMode,
  selectedSeatMap,
  selectedSeatMapData,
  seatMapPreviewData,
  step,
  posterPreview,
  bannerPreview,
  eventId,
  autoSaveEnabled = true,
  saveInterval = 3000, // 3 seconds
}: UseAutoSaveProps): UseAutoSaveReturn {
  const lastSavedRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  // Validate và xóa draft không hợp lệ khi component mount
  useEffect(() => {
    // getDraft() sẽ tự động xóa draft không có meaningful content
    const existingDraft = getDraft(eventId);
    if (!existingDraft) {
      // Đã bị xóa hoặc không tồn tại
      setSaveStatus("idle");
    }
  }, [eventId]);

  // Tạo data object để save
  const createDraftData = useCallback(
    (): Partial<EventDraftData> => ({
      formData,
      areas,
      showings,
      ticketingMode,
      selectedSeatMap,
      selectedSeatMapData,
      seatMapPreviewData,
      step,
      posterPreview,
      bannerPreview,
    }),
    [
      formData,
      areas,
      showings,
      ticketingMode,
      selectedSeatMap,
      selectedSeatMapData,
      seatMapPreviewData,
      step,
      posterPreview,
      bannerPreview,
    ]
  );

  // Force save function
  const forceSave = useCallback(() => {
    if (!autoSaveEnabled) return;

    const draftData = createDraftData();
    const currentDataString = JSON.stringify(draftData);

    // Chỉ save khi có thay đổi
    if (currentDataString === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");

    try {
      // Kiểm tra nếu có meaningful content mới save
      const fullDraftData = {
        ...draftData,
        lastSaved: Date.now(),
        isEditing: !!eventId,
        eventId: eventId || undefined,
      } as EventDraftData;

      if (hasMeaningfulContent(fullDraftData)) {
        saveDraft(draftData, eventId);
        lastSavedRef.current = currentDataString;
        const now = Date.now();
        setLastSaved(now);
        setSaveStatus("saved");
      } else {
        // Không save nếu chưa có content meaningful
        setSaveStatus("idle");
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus("error");
    }
  }, [createDraftData, eventId, autoSaveEnabled]);

  // Auto-save effect với debounce
  useEffect(() => {
    if (!autoSaveEnabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      forceSave();
    }, saveInterval);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [forceSave, saveInterval, autoSaveEnabled]);

  // Load draft function
  const loadDraft = useCallback(() => {
    return getDraft(eventId);
  }, [eventId]);

  // Clear draft function
  const clearSavedDraft = useCallback(() => {
    clearDraft(eventId);
    lastSavedRef.current = "";
    setSaveStatus("idle");
    setLastSaved(null);
  }, [eventId]);

  // Check if has draft
  const hasSavedDraft = hasDraft(eventId);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save khi user rời khỏi trang
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      forceSave();

      // Warning nếu có unsaved changes và có meaningful content
      const draftData = createDraftData();
      const fullDraftData = {
        ...draftData,
        lastSaved: Date.now(),
        isEditing: !!eventId,
        eventId: eventId || undefined,
      } as EventDraftData;

      if (autoSaveEnabled && hasMeaningfulContent(fullDraftData)) {
        e.preventDefault();
        e.returnValue =
          "Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang?";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        forceSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [forceSave, createDraftData, eventId, autoSaveEnabled]);

  return {
    hasSavedDraft,
    loadDraft,
    clearSavedDraft,
    forceSave,
    saveStatus,
    lastSaved,
  };
}

/**
 * Hook để xử lý draft recovery confirmation
 */
interface UseDraftRecoveryProps {
  onRestore: (draftData: EventDraftData) => void;
  eventId?: string | null;
  t: (key: string) => string;
}

interface UseDraftRecoveryReturn {
  showDraftRecovery: boolean;
  draftData: EventDraftData | null;
  acceptDraft: () => void;
  rejectDraft: () => void;
}

export function useDraftRecovery({
  onRestore,
  eventId,
  t,
}: UseDraftRecoveryProps): UseDraftRecoveryReturn {
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [draftData, setDraftData] = useState<EventDraftData | null>(null);

  // Check for draft on mount
  useEffect(() => {
    const draft = getDraft(eventId);
    if (draft && hasMeaningfulContent(draft)) {
      setDraftData(draft);
      setShowDraftRecovery(true);
    }
  }, [eventId]);

  const acceptDraft = useCallback(() => {
    if (draftData) {
      onRestore(draftData);
      setShowDraftRecovery(false);
      setDraftData(null);
    }
  }, [draftData, onRestore]);

  const rejectDraft = useCallback(() => {
    if (draftData) {
      clearDraft(eventId);
    }
    setShowDraftRecovery(false);
    setDraftData(null);
  }, [draftData, eventId]);

  return {
    showDraftRecovery,
    draftData,
    acceptDraft,
    rejectDraft,
  };
}
