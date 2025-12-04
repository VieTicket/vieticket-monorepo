/**
 * Draft Storage Utility
 * Handles auto-saving and restoring form data during event creation
 */

import type {
  EventFormData,
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
} from "@/types/event-types";
import type { ShowingWithAreas } from "@/types/showings";

export interface EventDraftData {
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
  lastSaved: number; // timestamp
  isEditing?: boolean; // để phân biệt tạo mới vs chỉnh sửa
  eventId?: string | null; // nếu đang edit
}

const DRAFT_STORAGE_KEY = "vieticket_event_draft";
const DRAFT_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 ngày

/**
 * Lưu draft vào localStorage
 */
export function saveDraft(
  data: Partial<EventDraftData>,
  eventId?: string | null
): void {
  try {
    const key = eventId
      ? `${DRAFT_STORAGE_KEY}_edit_${eventId}`
      : DRAFT_STORAGE_KEY;
    const existingDraft = getDraft(eventId);

    const draftData: EventDraftData = {
      ...existingDraft,
      ...data,
      lastSaved: Date.now(),
      isEditing: !!eventId,
      eventId: eventId || undefined,
    };

    localStorage.setItem(key, JSON.stringify(draftData));
  } catch (error) {
    console.warn("Failed to save draft:", error);
  }
}

/**
 * Lấy draft từ localStorage
 */
export function getDraft(eventId?: string | null): EventDraftData | null {
  try {
    const key = eventId
      ? `${DRAFT_STORAGE_KEY}_edit_${eventId}`
      : DRAFT_STORAGE_KEY;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const data: EventDraftData = JSON.parse(stored);

    // Kiểm tra xem draft có hết hạn không
    if (Date.now() - data.lastSaved > DRAFT_EXPIRY_TIME) {
      clearDraft(eventId);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Failed to load draft:", error);
    return null;
  }
}

/**
 * Kiểm tra xem có draft không
 */
export function hasDraft(eventId?: string | null): boolean {
  return getDraft(eventId) !== null;
}

/**
 * Xóa draft khỏi localStorage
 */
export function clearDraft(eventId?: string | null): void {
  try {
    const key = eventId
      ? `${DRAFT_STORAGE_KEY}_edit_${eventId}`
      : DRAFT_STORAGE_KEY;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear draft:", error);
  }
}

/**
 * Xóa tất cả draft cũ (cleanup)
 */
export function clearExpiredDrafts(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach((key) => {
      if (key.startsWith(DRAFT_STORAGE_KEY)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data: EventDraftData = JSON.parse(stored);
            if (now - data.lastSaved > DRAFT_EXPIRY_TIME) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Xóa key bị corrupted
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn("Failed to cleanup expired drafts:", error);
  }
}

/**
 * Tạo default draft data
 */
export function createDefaultDraftData(
  t: (key: string) => string
): EventDraftData {
  return {
    formData: {
      name: "",
      type: "",
      ticketSaleStart: "",
      ticketSaleEnd: "",
      location: "",
      description: "",
      posterUrl: "",
      bannerUrl: "",
      seatCount: "",
      ticketPrice: "",
      maxTicketsByOrder: undefined,
      startTime: "",
      endTime: "",
    },
    areas: [{ name: t("areaA"), seatCount: "", ticketPrice: "" }],
    showings: [
      {
        name: t("mainShowing"),
        startTime: "",
        endTime: "",
        areas: [],
      },
    ],
    ticketingMode: "simple" as TicketingMode,
    step: 1,
    lastSaved: Date.now(),
    isEditing: false,
  };
}

/**
 * Check if draft data has meaningful content (không chỉ là default values)
 */
export function hasMeaningfulContent(data: EventDraftData): boolean {
  const { formData, areas, showings } = data;

  // Check form data
  const hasFormContent =
    formData.name.trim().length >= 3 ||
    formData.location.trim().length >= 3 ||
    formData.description.trim().length >= 10 ||
    formData.posterUrl !== "" ||
    formData.bannerUrl !== "";

  // Check areas (chỉ check nếu khác default)
  const hasAreaContent = areas.some(
    (area) =>
      (area.seatCount.trim() !== "" && area.seatCount !== "0") ||
      (area.ticketPrice.trim() !== "" && area.ticketPrice !== "0")
  );

  // Check showings
  const hasShowingContent = showings.some(
    (showing) =>
      showing.startTime !== "" ||
      showing.endTime !== "" ||
      showing.ticketSaleStart !== "" ||
      showing.ticketSaleEnd !== "" ||
      (showing.name !== "" &&
        !showing.name.includes("mainShowing") &&
        !showing.name.includes("Main"))
  );

  // Also consider if user has progressed beyond step 1
  const hasProgress = data.step > 1;

  return hasFormContent || hasAreaContent || hasShowingContent || hasProgress;
}
