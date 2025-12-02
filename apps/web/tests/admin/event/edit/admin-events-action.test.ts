/**
 * Unit Test Cases for Admin Events Actions
 * Function Code: events-action.ts
 *
 * Functions under test:
 * - fetchEventByIdForAdmin(eventId: string)
 * - handleAdminUpdateEvent(formData: FormData)
 *
 * Test goals:
 * - Ensure admin authorisation is required
 * - Validate FormData parsing (showings, areas, seat map data)
 * - Ensure correct service functions are called based on ticketing mode & copyMode
 * - Validate error handling for invalid data and missing event
 * - Ensure no real DB connections (all external dependencies are mocked)
 */

import { describe, test, expect, beforeEach, afterEach, mock, afterAll } from "bun:test";

// Mock dependencies
const mockAuthorise = mock().mockResolvedValue({
  user: { id: "admin-user-id", role: "admin" },
});

const mockGetEventById = mock();
const mockUpdateEventWithShowingsAndSeatMap = mock().mockResolvedValue(undefined);
const mockUpdateEventWithShowingsAndSeatMapIndividual = mock().mockResolvedValue(
  undefined
);
const mockUpdateEventWithShowingsAndAreas = mock().mockResolvedValue(undefined);
const mockUpdateEventWithShowingsAndAreasIndividual = mock().mockResolvedValue(
  undefined
);

const mockRevalidatePath = mock().mockResolvedValue(undefined);
const mockSlugify = mock().mockImplementation((name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
);

// Mock console.error to avoid noisy logs in expected error tests
const originalConsoleError = console.error;
const mockConsoleError = mock();
console.error = mockConsoleError as any;

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock modules BEFORE importing the functions under test
mock.module("@/lib/auth/authorise", () => ({
  authorise: mockAuthorise,
}));

mock.module("@/lib/services/eventService", () => ({
  getEventById: mockGetEventById,
  updateEventWithShowingsAndSeatMap: mockUpdateEventWithShowingsAndSeatMap,
  updateEventWithShowingsAndSeatMapIndividual:
    mockUpdateEventWithShowingsAndSeatMapIndividual,
  updateEventWithShowingsAndAreas: mockUpdateEventWithShowingsAndAreas,
  updateEventWithShowingsAndAreasIndividual:
    mockUpdateEventWithShowingsAndAreasIndividual,
}));

mock.module("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

mock.module("@/lib/utils", () => ({
  slugify: mockSlugify,
}));

// Mock jose to avoid internal dependency errors from auth libraries
mock.module("jose", () => ({
  // Provide minimal stubs; tests in this file don't rely on real JWT behavior
  jwtVerify: mock().mockResolvedValue({ payload: {}, protectedHeader: {} }),
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setSubject() {
      return this;
    }
    sign() {
      return Promise.resolve("mock-token");
    }
  },
}));

// Some libraries may import jose via deep paths; mock those as well
mock.module("jose/dist/webapi", () => ({
  jwtVerify: mock().mockResolvedValue({ payload: {}, protectedHeader: {} }),
}));

mock.module("jose/dist/webapi/index.js", () => ({
  jwtVerify: mock().mockResolvedValue({ payload: {}, protectedHeader: {} }),
}));

mock.module("jose/dist/webapi/index", () => ({
  jwtVerify: mock().mockResolvedValue({ payload: {}, protectedHeader: {} }),
}));

mock.module("jose/webapi", () => ({
  jwtVerify: mock().mockResolvedValue({ payload: {}, protectedHeader: {} }),
}));

// Import functions under test
import {
  fetchEventByIdForAdmin,
  handleAdminUpdateEvent,
} from "@/lib/actions/admin/events-action";

describe("Admin Events Actions - fetchEventByIdForAdmin", () => {
  beforeEach(() => {
    mockAuthorise.mockClear();
    mockGetEventById.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  test("TC01: Fetch event by id with valid admin session (Normal)", async () => {
    const fakeEvent = {
      id: "event-1",
      name: "Test Event",
    };
    mockGetEventById.mockResolvedValueOnce(fakeEvent);

    const result = await fetchEventByIdForAdmin("event-1");

    // Confirmation: Should authorise admin and fetch event correctly
    expect(mockAuthorise).toHaveBeenCalledWith("admin");
    expect(mockGetEventById).toHaveBeenCalledWith("event-1");
    expect(result).toEqual(fakeEvent);
  });

  test("TC02: Fetch event by id without valid admin session (Abnormal)", async () => {
    mockAuthorise.mockRejectedValueOnce(new Error("No valid session"));

    await expect(fetchEventByIdForAdmin("event-1")).rejects.toThrow(
      "No valid session"
    );
    expect(mockGetEventById).not.toHaveBeenCalled();
  });
});

describe("Admin Events Actions - handleAdminUpdateEvent", () => {
  beforeEach(() => {
    mockAuthorise.mockClear();
    mockGetEventById.mockClear();
    mockUpdateEventWithShowingsAndSeatMap.mockClear();
    mockUpdateEventWithShowingsAndSeatMapIndividual.mockClear();
    mockUpdateEventWithShowingsAndAreas.mockClear();
    mockUpdateEventWithShowingsAndAreasIndividual.mockClear();
    mockRevalidatePath.mockClear();
    mockSlugify.mockClear();
    mockConsoleError.mockClear();

    // Default existing event
    mockGetEventById.mockResolvedValue({
      id: "event-1",
      name: "Original Event",
      startTime: new Date("2025-01-01T10:00:00Z").toISOString(),
      endTime: new Date("2025-01-01T12:00:00Z").toISOString(),
      location: "Original Location",
      type: "Original",
      createdAt: new Date("2024-12-01T00:00:00Z").toISOString(),
      organizerId: "org-1",
      views: 10,
      approvalStatus: "approved",
    });

    mockSlugify.mockImplementation((name: string) =>
      name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
    );
  });

  afterEach(async () => {
    await Promise.resolve();
  });

  function createBaseFormData() {
    const form = new FormData();
    form.set("eventId", "event-1");
    form.set("name", "Updated Event Name");
    form.set("description", "Updated description");
    form.set("location", "Updated Location");
    form.set("type", "Music");
    form.set("ticketSaleStart", "2025-01-01T08:00:00.000Z");
    form.set("ticketSaleEnd", "2025-01-01T09:00:00.000Z");
    form.set("posterUrl", "https://example.com/poster.jpg");
    form.set("bannerUrl", "https://example.com/banner.jpg");
    form.set("maxTicketsByOrder", "5");
    return form;
  }

  test("TC03: Update event with seatmap ticketing and copyMode=true (Normal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "seatmap");
    form.set("seatMapId", "seatmap-1");
    form.set(
      "seatMapData",
      JSON.stringify({
        grids: [{ id: "grid-1" }],
        defaultSeatSettings: { price: 100000 },
      })
    );
    form.set("showingConfigs[0].copyMode", "true");

    // One showing
    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");
    form.set("showings[0].ticketSaleStart", "2024-12-25T10:00:00.000Z");
    form.set("showings[0].ticketSaleEnd", "2024-12-31T10:00:00.000Z");

    const result = await handleAdminUpdateEvent(form);

    // Confirmation: Should update event successfully with shared seatmap config
    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockUpdateEventWithShowingsAndSeatMap).toHaveBeenCalledTimes(1);
    const [eventPayload] = mockUpdateEventWithShowingsAndSeatMap.mock.calls[0];
    expect(eventPayload.name).toBe("Updated Event Name");
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  test("TC04: Update event with seatmap ticketing and individual configs (Normal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "seatmap");
    form.set("seatMapId", "seatmap-1");
    form.set(
      "seatMapData",
      JSON.stringify({
        grids: [{ id: "grid-1" }],
        defaultSeatSettings: { price: 100000 },
      })
    );
    form.set("showingConfigs[0].copyMode", "false");

    // Two showings
    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");
    form.set("showings[0].ticketSaleStart", "2024-12-25T10:00:00.000Z");
    form.set("showings[0].ticketSaleEnd", "2024-12-31T10:00:00.000Z");

    form.set("showings[1].name", "Showing 2");
    form.set("showings[1].startTime", "2025-01-02T10:00:00.000Z");
    form.set("showings[1].endTime", "2025-01-02T12:00:00.000Z");
    form.set("showings[1].ticketSaleStart", "2024-12-26T10:00:00.000Z");
    form.set("showings[1].ticketSaleEnd", "2025-01-01T10:00:00.000Z");

    // Per-showing seatmap configs
    form.set(
      "showingConfigs[0].seatMapData",
      JSON.stringify({ grids: [{ id: "grid-1A" }] })
    );
    form.set(
      "showingConfigs[1].seatMapData",
      JSON.stringify({ grids: [{ id: "grid-1B" }] })
    );

    const result = await handleAdminUpdateEvent(form);

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(
      mockUpdateEventWithShowingsAndSeatMapIndividual
    ).toHaveBeenCalledTimes(1);
    const [, showingsArg, configsArg] =
      mockUpdateEventWithShowingsAndSeatMapIndividual.mock.calls[0];
    expect(showingsArg.length).toBe(2);
    expect(configsArg.length).toBe(2);
  });

  test("TC05: Update event with simple ticketing and copyMode=true (Normal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");
    form.set("showingConfigs[0].copyMode", "true");

    // One showing
    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    // Areas (shared)
    form.set("areas[0].name", "VIP");
    form.set("areas[0].seatCount", "10");
    form.set("areas[0].ticketPrice", "200000");

    const result = await handleAdminUpdateEvent(form);

    // Confirmation: Should update event with shared areas config
    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(mockUpdateEventWithShowingsAndAreas).toHaveBeenCalledTimes(1);
    const [, , areasArg] = mockUpdateEventWithShowingsAndAreas.mock.calls[0];
    expect(areasArg.length).toBe(1);
  });

  test("TC06: Update event with simple ticketing and individual areas per showing (Normal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");
    form.set("showingConfigs[0].copyMode", "false");

    // Two showings
    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    form.set("showings[1].name", "Showing 2");
    form.set("showings[1].startTime", "2025-01-02T10:00:00.000Z");
    form.set("showings[1].endTime", "2025-01-02T12:00:00.000Z");

    // Areas per showing
    form.set("showingConfigs[0].areas[0].name", "VIP");
    form.set("showingConfigs[0].areas[0].seatCount", "10");
    form.set("showingConfigs[0].areas[0].ticketPrice", "200000");

    form.set("showingConfigs[1].areas[0].name", "Standard");
    form.set("showingConfigs[1].areas[0].seatCount", "20");
    form.set("showingConfigs[1].areas[0].ticketPrice", "100000");

    const result = await handleAdminUpdateEvent(form);

    expect(result).toEqual({ success: true, eventId: "event-1" });
    expect(
      mockUpdateEventWithShowingsAndAreasIndividual
    ).toHaveBeenCalledTimes(1);
    const [, , showingAreasArg] =
      mockUpdateEventWithShowingsAndAreasIndividual.mock.calls[0];
    expect(showingAreasArg.length).toBe(2);
    expect(showingAreasArg[0][0].name).toBe("VIP");
    expect(showingAreasArg[1][0].name).toBe("Standard");
  });

  test("TC07: Event not found should throw error (Abnormal)", async () => {
    mockGetEventById.mockResolvedValueOnce(null);

    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow("Event not found");
    expect(mockUpdateEventWithShowingsAndAreas).not.toHaveBeenCalled();
    expect(mockUpdateEventWithShowingsAndSeatMap).not.toHaveBeenCalled();
  });

  test("TC08: Invalid showing date format should throw error (Abnormal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");

    form.set("showings[0].name", "Invalid Showing");
    form.set("showings[0].startTime", "invalid-date");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow(
      "Invalid date format in showing: Invalid Showing"
    );
  });

  test("TC09: Seatmap mode with empty grids should throw error (Abnormal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "seatmap");
    form.set("seatMapId", "seatmap-1");
    form.set(
      "seatMapData",
      JSON.stringify({
        grids: [],
        defaultSeatSettings: { price: 100000 },
      })
    );
    form.set("showingConfigs[0].copyMode", "true");

    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow(
      "Seat map has no seating areas configured"
    );
    expect(mockUpdateEventWithShowingsAndSeatMap).not.toHaveBeenCalled();
  });

  test("TC10: Simple ticketing copyMode=true with no areas should throw error (Abnormal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");
    form.set("showingConfigs[0].copyMode", "true");

    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow(
      "At least one area is required for simple ticketing"
    );
    expect(mockUpdateEventWithShowingsAndAreas).not.toHaveBeenCalled();
  });

  test("TC11: Simple ticketing individual mode with empty areas for a showing should throw error (Abnormal)", async () => {
    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");
    form.set("showingConfigs[0].copyMode", "false");

    form.set("showings[0].name", "Showing 1");
    form.set("showings[0].startTime", "2025-01-01T10:00:00.000Z");
    form.set("showings[0].endTime", "2025-01-01T12:00:00.000Z");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow(
      "Showing 1 must have at least one area"
    );
    expect(
      mockUpdateEventWithShowingsAndAreasIndividual
    ).not.toHaveBeenCalled();
  });

  test("TC12: Authorisation failure should prevent update (Abnormal)", async () => {
    mockAuthorise.mockRejectedValueOnce(new Error("No valid session"));

    const form = createBaseFormData();
    form.set("ticketingMode", "simple");
    form.set("seatMapId", "");

    await expect(handleAdminUpdateEvent(form)).rejects.toThrow(
      "No valid session"
    );
    // Confirmation: Should not call any data access functions when auth fails
    expect(mockGetEventById).not.toHaveBeenCalled();
    expect(mockUpdateEventWithShowingsAndAreas).not.toHaveBeenCalled();
    expect(mockUpdateEventWithShowingsAndSeatMap).not.toHaveBeenCalled();
  });
});


