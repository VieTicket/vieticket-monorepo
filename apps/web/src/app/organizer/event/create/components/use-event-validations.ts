import { useState } from "react";
import type { ShowingWithAreas } from "@/types/showings";
import type { EventFormData } from "@/types/event-types";
import { useTranslations } from "next-intl";

const VALIDATION_CONFIG = {
  MIN_SHOWING_DURATION_MINUTES: 30,
  MAX_SHOWING_DURATION_HOURS: 24,
  MIN_TICKET_SALE_START_DAYS_BEFORE: 2,
  MIN_TICKET_SALE_END_DAYS_BEFORE: 1,
  MIN_TICKET_SALE_WINDOW_HOURS: 6,
  MAX_TICKET_SALE_WINDOW_DAYS: 90,
  MIN_BUFFER_BETWEEN_SHOWINGS_HOURS: 1,
};

export function useEventValidation() {
  const t = useTranslations("organizer-dashboard.CreateEvent");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getCurrentVietnamTime = (): Date => new Date();

  const validateSingleShowing = (
    showing: ShowingWithAreas,
    index: number
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const now = getCurrentVietnamTime();

    if (!showing.startTime) {
      errors[`showing-${index}-startTime`] = t("errors.startTimePast");
      return { valid: false, errors };
    }

    if (!showing.endTime) {
      errors[`showing-${index}-endTime`] = t("errors.endTimePast");
      return { valid: false, errors };
    }

    const startTime = new Date(showing.startTime);
    const endTime = new Date(showing.endTime);

    if (startTime <= now) {
      errors[`showing-${index}-startTime`] = t("errors.startTimePast");
    }

    if (endTime <= startTime) {
      errors[`showing-${index}-endTime`] = t("errors.endTimeBeforeStart");
    } else {
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      const durationHours = durationMinutes / 60;

      if (durationMinutes < VALIDATION_CONFIG.MIN_SHOWING_DURATION_MINUTES) {
        errors[`showing-${index}-endTime`] = t(
          "errors.showingDurationTooShort"
        );
      }

      if (durationHours > VALIDATION_CONFIG.MAX_SHOWING_DURATION_HOURS) {
        errors[`showing-${index}-endTime`] = t("errors.showingDurationTooLong");
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateTicketSaleTimes = (
    showing: ShowingWithAreas,
    index: number
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const now = getCurrentVietnamTime();

    if (!showing.ticketSaleStart) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartRequired"
      );
      return { valid: false, errors };
    }

    if (!showing.ticketSaleEnd) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndRequired"
      );
      return { valid: false, errors };
    }

    if (!showing.startTime) {
      return { valid: false, errors };
    }

    const ticketSaleStart = new Date(showing.ticketSaleStart);
    const ticketSaleEnd = new Date(showing.ticketSaleEnd);
    const showingStart = new Date(showing.startTime);

    if (ticketSaleStart <= now) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartPast"
      );
    }

    if (ticketSaleEnd <= ticketSaleStart) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndAfterStart"
      );
    }

    const minSaleStart = new Date(showingStart);
    minSaleStart.setDate(
      minSaleStart.getDate() -
        VALIDATION_CONFIG.MIN_TICKET_SALE_START_DAYS_BEFORE
    );

    if (ticketSaleStart > minSaleStart) {
      errors[`showing-${index}-ticketSaleStart`] = t(
        "errors.ticketSaleStartTooLate"
      );
    }

    const maxSaleEnd = new Date(showingStart);
    maxSaleEnd.setDate(
      maxSaleEnd.getDate() - VALIDATION_CONFIG.MIN_TICKET_SALE_END_DAYS_BEFORE
    );

    if (ticketSaleEnd > maxSaleEnd) {
      errors[`showing-${index}-ticketSaleEnd`] = t(
        "errors.ticketSaleEndTooLate"
      );
    }

    if (ticketSaleStart && ticketSaleEnd && ticketSaleEnd > ticketSaleStart) {
      const saleWindowMs = ticketSaleEnd.getTime() - ticketSaleStart.getTime();
      const saleWindowHours = saleWindowMs / (1000 * 60 * 60);
      const saleWindowDays = saleWindowHours / 24;

      if (saleWindowHours < VALIDATION_CONFIG.MIN_TICKET_SALE_WINDOW_HOURS) {
        errors[`showing-${index}-ticketSaleStart`] = t(
          "errors.ticketSaleWindowTooShort"
        );
      }

      if (saleWindowDays > VALIDATION_CONFIG.MAX_TICKET_SALE_WINDOW_DAYS) {
        errors[`showing-${index}-ticketSaleEnd`] = t(
          "errors.ticketSaleWindowTooLong"
        );
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateMultipleShowings = (
    showings: ShowingWithAreas[]
  ): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const validShowings = showings.filter((s) => s.startTime && s.endTime);

    if (validShowings.length <= 1) {
      return { valid: true, errors };
    }

    const sortedShowings = [...validShowings].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const startTimes = new Set<number>();

    for (let i = 0; i < sortedShowings.length; i++) {
      const startTime = new Date(sortedShowings[i].startTime).getTime();

      if (startTimes.has(startTime)) {
        const originalIndex = showings.findIndex(
          (s) => s.startTime === sortedShowings[i].startTime
        );
        errors[`showing-${originalIndex}-startTime`] = t(
          "errors.duplicateShowingTime"
        );
      } else {
        startTimes.add(startTime);
      }
    }

    for (let i = 0; i < sortedShowings.length - 1; i++) {
      const currentShowing = sortedShowings[i];
      const nextShowing = sortedShowings[i + 1];

      const currentEnd = new Date(currentShowing.endTime);
      const nextStart = new Date(nextShowing.startTime);

      const bufferMs = nextStart.getTime() - currentEnd.getTime();
      const bufferHours = bufferMs / (1000 * 60 * 60);

      if (bufferHours < VALIDATION_CONFIG.MIN_BUFFER_BETWEEN_SHOWINGS_HOURS) {
        const nextOriginalIndex = showings.findIndex(
          (s) =>
            s.startTime === nextShowing.startTime &&
            s.endTime === nextShowing.endTime
        );
        errors[`showing-${nextOriginalIndex}-startTime`] = t(
          "errors.showingTimesOverlap"
        );
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateAllShowings = (
    showings: ShowingWithAreas[]
  ): { valid: boolean; errors: Record<string, string> } => {
    const allErrors: Record<string, string> = {};

    if (showings.length === 0 || !showings.some((s) => s.startTime)) {
      allErrors.showings = t("errors.showingRequired");
      return { valid: false, errors: allErrors };
    }

    for (let i = 0; i < showings.length; i++) {
      if (showings[i].startTime || showings[i].endTime) {
        const showingValidation = validateSingleShowing(showings[i], i);
        Object.assign(allErrors, showingValidation.errors);

        const ticketSaleValidation = validateTicketSaleTimes(showings[i], i);
        Object.assign(allErrors, ticketSaleValidation.errors);
      }
    }

    const multipleShowingsValidation = validateMultipleShowings(showings);
    Object.assign(allErrors, multipleShowingsValidation.errors);

    return { valid: Object.keys(allErrors).length === 0, errors: allErrors };
  };

  const validateBasicInfo = (
    formData: EventFormData
  ): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("errors.nameRequired");
    }
    if (!formData.location.trim()) {
      newErrors.location = t("errors.locationRequired");
    }
    if (!formData.description.trim()) {
      newErrors.description = t("errors.descriptionRequired");
    } else {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = formData.description;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      if (textContent.length > 5000) {
        newErrors.description = t("errors.descriptionTooLong");
      }
    }

    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder < 1) {
      newErrors.maxTicketsByOrder = t("errors.maxTicketsMin");
    }
    if (formData.maxTicketsByOrder && formData.maxTicketsByOrder > 20) {
      newErrors.maxTicketsByOrder = t("errors.maxTicketsMax");
    }

    return newErrors;
  };

  const validateStep1 = (
    formData: EventFormData,
    showings: ShowingWithAreas[]
  ): boolean => {
    const basicErrors = validateBasicInfo(formData);
    const showingsValidation = validateAllShowings(showings);

    const allErrors = { ...basicErrors, ...showingsValidation.errors };
    setErrors(allErrors);

    return Object.keys(allErrors).length === 0;
  };

  const validateForSubmission = (
    formData: EventFormData,
    showings: ShowingWithAreas[]
  ): { valid: boolean; errors: Record<string, string> } => {
    const basicErrors = validateBasicInfo(formData);
    const showingsValidation = validateAllShowings(showings);

    const allErrors = { ...basicErrors, ...showingsValidation.errors };

    setErrors((prev) => {
      const newErrors = { ...prev };

      // Clear showing-related errors
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("showing-") || key === "showings") {
          delete newErrors[key];
        }
      });

      Object.assign(newErrors, allErrors);

      return newErrors;
    });

    return {
      valid: Object.keys(allErrors).length === 0,
      errors: allErrors,
    };
  };

  const clearShowingErrors = () => {
    setErrors((prev) => {
      const newErrors = { ...prev };

      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith("showing-") ||
          key === "showings" ||
          key === "ticketSaleStart" ||
          key === "ticketSaleEnd"
        ) {
          delete newErrors[key];
        }
      });

      return newErrors;
    });
  };

  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const updateShowingErrors = (showings: ShowingWithAreas[]) => {
    const showingsValidation = validateAllShowings(showings);

    setErrors((prev) => {
      const newErrors = { ...prev };

      // Clear old showing errors
      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith("showing-") ||
          key === "showings" ||
          key === "ticketSaleStart" ||
          key === "ticketSaleEnd"
        ) {
          delete newErrors[key];
        }
      });

      // Add new showing errors
      Object.assign(newErrors, showingsValidation.errors);

      return newErrors;
    });
  };

  return {
    errors,
    setErrors,
    validateStep1,
    validateForSubmission,
    validateAllShowings,
    clearShowingErrors,
    clearFieldError,
    updateShowingErrors,
  };
}
