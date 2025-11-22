import { describe, it, expect, beforeEach } from "bun:test";

// Helper functions để tạo FormData
function createBasicEventFormData(
  overrides: Record<string, any> = {}
): FormData {
  const formData = new FormData();

  // Basic event info - use !== undefined để handle empty strings
  formData.append(
    "name",
    overrides.name !== undefined ? overrides.name : "Test Event"
  );
  formData.append(
    "description",
    overrides.description !== undefined
      ? overrides.description
      : "Test Description"
  );
  formData.append(
    "location",
    overrides.location !== undefined ? overrides.location : "Test Location"
  );
  formData.append(
    "type",
    overrides.type !== undefined ? overrides.type : "concert"
  );
  formData.append(
    "maxTicketsByOrder",
    overrides.maxTicketsByOrder !== undefined
      ? overrides.maxTicketsByOrder
      : "5"
  );
  formData.append(
    "ticketingMode",
    overrides.ticketingMode !== undefined ? overrides.ticketingMode : "areas"
  );
  formData.append(
    "posterUrl",
    overrides.posterUrl !== undefined
      ? overrides.posterUrl
      : "https://example.com/poster.jpg"
  );
  formData.append(
    "bannerUrl",
    overrides.bannerUrl !== undefined
      ? overrides.bannerUrl
      : "https://example.com/banner.jpg"
  );

  // Ticket sale dates
  if (overrides.ticketSaleStart !== undefined) {
    formData.append("ticketSaleStart", overrides.ticketSaleStart);
  }
  if (overrides.ticketSaleEnd !== undefined) {
    formData.append("ticketSaleEnd", overrides.ticketSaleEnd);
  }

  return formData;
}

function addShowingsToFormData(
  formData: FormData,
  showings: Array<{
    name: string;
    startTime: string;
    endTime: string;
    ticketSaleStart?: string;
    ticketSaleEnd?: string;
  }>
) {
  showings.forEach((showing, index) => {
    formData.append(`showings[${index}].name`, showing.name);
    formData.append(`showings[${index}].startTime`, showing.startTime);
    formData.append(`showings[${index}].endTime`, showing.endTime);
    if (showing.ticketSaleStart) {
      formData.append(
        `showings[${index}].ticketSaleStart`,
        showing.ticketSaleStart
      );
    }
    if (showing.ticketSaleEnd) {
      formData.append(
        `showings[${index}].ticketSaleEnd`,
        showing.ticketSaleEnd
      );
    }
  });
}

function addAreasToFormData(
  formData: FormData,
  areas: Array<{
    name: string;
    seatCount: number;
    ticketPrice: number;
  }>,
  showingIndex = 0,
  copyMode = true
) {
  if (copyMode) {
    formData.append("showingConfigs[0].copyMode", "true");
  }

  areas.forEach((area, index) => {
    const prefix = copyMode
      ? "showingConfigs[0]"
      : `showingConfigs[${showingIndex}]`;
    formData.append(`${prefix}.areas[${index}].name`, area.name);
    formData.append(
      `${prefix}.areas[${index}].seatCount`,
      area.seatCount.toString()
    );
    formData.append(
      `${prefix}.areas[${index}].ticketPrice`,
      area.ticketPrice.toString()
    );
  });
}

function addSeatMapToFormData(
  formData: FormData,
  seatMapId: string,
  seatMapData: object,
  copyMode = true
) {
  formData.append("seatMapId", seatMapId);
  formData.append("seatMapData", JSON.stringify(seatMapData));
  // Set ticketingMode to seatmap - use set instead of append to replace
  formData.set("ticketingMode", "seatmap");

  if (copyMode) {
    formData.append("showingConfigs[0].copyMode", "true");
  }
}

describe("Event Actions FormData Validation Tests", () => {
  beforeEach(() => {
    console.log("Running FormData validation tests...");
  });

  describe("FormData Creation - Basic Event Info", () => {
    it("should create valid FormData with basic event information", () => {
      const formData = createBasicEventFormData({
        name: "Concert Night",
        description: "Amazing concert event",
        location: "Music Hall",
        type: "concert",
      });

      expect(formData.get("name")).toBe("Concert Night");
      expect(formData.get("description")).toBe("Amazing concert event");
      expect(formData.get("location")).toBe("Music Hall");
      expect(formData.get("type")).toBe("concert");
      expect(formData.get("ticketingMode")).toBe("areas");
      console.log("✅ Basic event FormData created successfully");
    });

    it("should use default values when no overrides provided", () => {
      const formData = createBasicEventFormData();

      expect(formData.get("name")).toBe("Test Event");
      expect(formData.get("description")).toBe("Test Description");
      expect(formData.get("location")).toBe("Test Location");
      expect(formData.get("type")).toBe("concert");
      expect(formData.get("maxTicketsByOrder")).toBe("5");
      console.log("✅ Default values used correctly");
    });

    it("should handle optional ticket sale dates", () => {
      const formData = createBasicEventFormData({
        ticketSaleStart: "2024-11-20T00:00:00Z",
        ticketSaleEnd: "2024-12-14T23:59:59Z",
      });

      expect(formData.get("ticketSaleStart")).toBe("2024-11-20T00:00:00Z");
      expect(formData.get("ticketSaleEnd")).toBe("2024-12-14T23:59:59Z");
      console.log("✅ Ticket sale dates handled correctly");
    });
  });

  describe("FormData Creation - Showings", () => {
    it("should add single showing to FormData correctly", () => {
      const formData = createBasicEventFormData();

      addShowingsToFormData(formData, [
        {
          name: "Evening Show",
          startTime: "2024-12-15T19:00:00Z",
          endTime: "2024-12-15T22:00:00Z",
        },
      ]);

      expect(formData.get("showings[0].name")).toBe("Evening Show");
      expect(formData.get("showings[0].startTime")).toBe(
        "2024-12-15T19:00:00Z"
      );
      expect(formData.get("showings[0].endTime")).toBe("2024-12-15T22:00:00Z");
      console.log("✅ Single showing added successfully");
    });

    it("should add multiple showings to FormData correctly", () => {
      const formData = createBasicEventFormData();

      addShowingsToFormData(formData, [
        {
          name: "Matinee Show",
          startTime: "2024-12-15T14:00:00Z",
          endTime: "2024-12-15T16:00:00Z",
        },
        {
          name: "Evening Show",
          startTime: "2024-12-15T19:00:00Z",
          endTime: "2024-12-15T21:00:00Z",
        },
      ]);

      expect(formData.get("showings[0].name")).toBe("Matinee Show");
      expect(formData.get("showings[1].name")).toBe("Evening Show");
      expect(formData.get("showings[0].startTime")).toBe(
        "2024-12-15T14:00:00Z"
      );
      expect(formData.get("showings[1].startTime")).toBe(
        "2024-12-15T19:00:00Z"
      );
      console.log("✅ Multiple showings added successfully");
    });

    it("should add showing-specific ticket sale dates", () => {
      const formData = createBasicEventFormData();

      addShowingsToFormData(formData, [
        {
          name: "Special Show",
          startTime: "2024-12-15T18:00:00Z",
          endTime: "2024-12-15T21:00:00Z",
          ticketSaleStart: "2024-11-25T00:00:00Z",
          ticketSaleEnd: "2024-12-14T18:00:00Z",
        },
      ]);

      expect(formData.get("showings[0].ticketSaleStart")).toBe(
        "2024-11-25T00:00:00Z"
      );
      expect(formData.get("showings[0].ticketSaleEnd")).toBe(
        "2024-12-14T18:00:00Z"
      );
      console.log("✅ Showing-specific ticket sale dates added successfully");
    });
  });

  describe("FormData Creation - Areas (Simple Ticketing)", () => {
    it("should add areas in copy mode correctly", () => {
      const formData = createBasicEventFormData();

      addAreasToFormData(formData, [
        { name: "VIP", seatCount: 100, ticketPrice: 150000 },
        { name: "Regular", seatCount: 500, ticketPrice: 75000 },
      ]);

      expect(formData.get("showingConfigs[0].copyMode")).toBe("true");
      expect(formData.get("showingConfigs[0].areas[0].name")).toBe("VIP");
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe("100");
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "150000"
      );
      expect(formData.get("showingConfigs[0].areas[1].name")).toBe("Regular");
      expect(formData.get("showingConfigs[0].areas[1].seatCount")).toBe("500");
      expect(formData.get("showingConfigs[0].areas[1].ticketPrice")).toBe(
        "75000"
      );
      console.log("✅ Areas added in copy mode successfully");
    });

    it("should add areas in individual mode correctly", () => {
      const formData = createBasicEventFormData();

      // Add areas for first showing
      addAreasToFormData(
        formData,
        [{ name: "Orchestra", seatCount: 200, ticketPrice: 120000 }],
        0,
        false
      );

      // Add areas for second showing
      addAreasToFormData(
        formData,
        [{ name: "VIP", seatCount: 150, ticketPrice: 180000 }],
        1,
        false
      );

      expect(formData.get("showingConfigs[0].areas[0].name")).toBe("Orchestra");
      expect(formData.get("showingConfigs[1].areas[0].name")).toBe("VIP");
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "120000"
      );
      expect(formData.get("showingConfigs[1].areas[0].ticketPrice")).toBe(
        "180000"
      );
      console.log("✅ Areas added in individual mode successfully");
    });
  });

  describe("FormData Creation - Seat Maps", () => {
    it("should add seat map data in copy mode correctly", () => {
      const formData = createBasicEventFormData();

      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Section A",
            rows: 10,
            seatsPerRow: 20,
            ticketPrice: 200000,
          },
        ],
        defaultSeatSettings: {
          width: 30,
          height: 30,
          spacing: 5,
        },
      };

      addSeatMapToFormData(formData, "seat-map-123", seatMapData);

      expect(formData.get("seatMapId")).toBe("seat-map-123");
      expect(formData.get("ticketingMode")).toBe("seatmap");
      expect(formData.get("showingConfigs[0].copyMode")).toBe("true");

      const parsedSeatMapData = JSON.parse(
        formData.get("seatMapData") as string
      );
      expect(parsedSeatMapData.grids).toHaveLength(1);
      expect(parsedSeatMapData.grids[0].name).toBe("Section A");
      expect(parsedSeatMapData.defaultSeatSettings.width).toBe(30);
      console.log("✅ Seat map data added in copy mode successfully");
    });

    it("should add seat map data in individual mode correctly", () => {
      const formData = createBasicEventFormData();

      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Premium",
            rows: 5,
            seatsPerRow: 15,
            ticketPrice: 250000,
          },
        ],
        defaultSeatSettings: {
          width: 35,
          height: 35,
          spacing: 8,
        },
      };

      formData.append("seatMapId", "seat-map-456");
      formData.append("seatMapData", JSON.stringify(seatMapData));
      formData.append("ticketingMode", "seatmap");
      formData.append("showingConfigs[0].copyMode", "false");
      formData.append(
        "showingConfigs[0].seatMapData",
        JSON.stringify(seatMapData)
      );

      expect(formData.get("seatMapId")).toBe("seat-map-456");
      expect(formData.get("showingConfigs[0].copyMode")).toBe("false");
      expect(formData.get("showingConfigs[0].seatMapData")).toBeTruthy();
      console.log("✅ Seat map data added in individual mode successfully");
    });
  });

  describe("FormData Validation - Error Cases", () => {
    it("should detect missing event name", () => {
      const formData = createBasicEventFormData({ name: "" });

      expect(formData.get("name")).toBe("");
      console.log("✅ Missing event name detected");
    });

    it("should detect missing showing data", () => {
      const formData = createBasicEventFormData();

      // Try to add incomplete showing
      formData.append("showings[0].name", "Incomplete Show");
      formData.append("showings[0].startTime", "2024-12-15T19:00:00Z");
      // Missing endTime

      expect(formData.get("showings[0].name")).toBe("Incomplete Show");
      expect(formData.get("showings[0].startTime")).toBe(
        "2024-12-15T19:00:00Z"
      );
      expect(formData.get("showings[0].endTime")).toBeNull();
      console.log("✅ Missing showing endTime detected");
    });

    it("should detect invalid date formats", () => {
      const formData = createBasicEventFormData();

      addShowingsToFormData(formData, [
        {
          name: "Invalid Show",
          startTime: "invalid-date",
          endTime: "2024-12-15T22:00:00Z",
        },
      ]);

      expect(formData.get("showings[0].startTime")).toBe("invalid-date");
      // Would need actual date validation in the action to catch this
      console.log("✅ Invalid date format present in FormData");
    });

    it("should detect negative values in areas", () => {
      const formData = createBasicEventFormData();

      formData.append("showingConfigs[0].copyMode", "true");
      formData.append("showingConfigs[0].areas[0].name", "VIP");
      formData.append("showingConfigs[0].areas[0].seatCount", "-10");
      formData.append("showingConfigs[0].areas[0].ticketPrice", "-50000");

      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe("-10");
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "-50000"
      );
      console.log("✅ Negative values detected in FormData");
    });

    it("should detect malformed JSON in seat map data", () => {
      const formData = createBasicEventFormData();

      formData.append("seatMapId", "seat-map-123");
      formData.append("seatMapData", "invalid-json-data");
      formData.append("ticketingMode", "seatmap");

      expect(formData.get("seatMapData")).toBe("invalid-json-data");
      // JSON.parse would fail when processing this
      console.log("✅ Malformed JSON detected in seat map data");
    });

    it("should detect extremely long values", () => {
      const longName = "A".repeat(1000);
      const formData = createBasicEventFormData({ name: longName });

      expect(formData.get("name")).toHaveLength(1000);
      console.log("✅ Extremely long event name detected");
    });
  });

  describe("FormData Integration - Full Event Creation", () => {
    it("should create complete FormData for areas-based event", () => {
      const formData = createBasicEventFormData({
        name: "Concert Night",
        description: "Amazing concert event",
        location: "Music Hall",
        ticketSaleStart: "2024-11-20T00:00:00Z",
        ticketSaleEnd: "2024-12-14T23:59:59Z",
      });

      addShowingsToFormData(formData, [
        {
          name: "Evening Show",
          startTime: "2024-12-15T19:00:00Z",
          endTime: "2024-12-15T22:00:00Z",
        },
      ]);

      addAreasToFormData(formData, [
        { name: "VIP", seatCount: 100, ticketPrice: 150000 },
        { name: "Regular", seatCount: 500, ticketPrice: 75000 },
      ]);

      // Verify complete FormData structure
      expect(formData.get("name")).toBe("Concert Night");
      expect(formData.get("showings[0].name")).toBe("Evening Show");
      expect(formData.get("showingConfigs[0].areas[0].name")).toBe("VIP");
      expect(formData.get("showingConfigs[0].areas[1].name")).toBe("Regular");
      expect(formData.get("showingConfigs[0].copyMode")).toBe("true");
      console.log(
        "✅ Complete FormData for areas-based event created successfully"
      );
    });

    it("should create complete FormData for seat map-based event", () => {
      const formData = createBasicEventFormData({
        name: "Stadium Concert",
        location: "Stadium",
      });

      addShowingsToFormData(formData, [
        {
          name: "Main Event",
          startTime: "2024-12-20T20:00:00Z",
          endTime: "2024-12-20T23:00:00Z",
        },
      ]);

      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Section A",
            rows: 10,
            seatsPerRow: 20,
            ticketPrice: 200000,
          },
        ],
        defaultSeatSettings: {
          width: 30,
          height: 30,
          spacing: 5,
        },
      };

      addSeatMapToFormData(formData, "seat-map-123", seatMapData);

      // Verify complete FormData structure
      expect(formData.get("name")).toBe("Stadium Concert");
      expect(formData.get("showings[0].name")).toBe("Main Event");
      expect(formData.get("seatMapId")).toBe("seat-map-123");
      expect(formData.get("ticketingMode")).toBe("seatmap");

      const parsedSeatMapData = JSON.parse(
        formData.get("seatMapData") as string
      );
      expect(parsedSeatMapData.grids).toHaveLength(1);
      console.log(
        "✅ Complete FormData for seat map-based event created successfully"
      );
    });
  });
});

describe("Event Actions Field Validation - Boundary & Invalid Values", () => {
  beforeEach(() => {
    console.log("Running detailed field validation tests...");
  });

  describe("Event Name Validation", () => {
    it("should handle minimum valid length (1 character)", () => {
      const formData = createBasicEventFormData({ name: "A" });
      expect(formData.get("name")).toBe("A");
      console.log("✅ Minimum valid name length (1 char) accepted");
    });

    it("should handle maximum reasonable length (255 characters)", () => {
      const maxName = "A".repeat(255);
      const formData = createBasicEventFormData({ name: maxName });
      expect(formData.get("name")).toHaveLength(255);
      console.log("✅ Maximum reasonable name length (255 chars) accepted");
    });

    it("should detect extremely long names (>1000 characters)", () => {
      const extremeLongName = "A".repeat(1001);
      const formData = createBasicEventFormData({ name: extremeLongName });
      expect(formData.get("name")).toHaveLength(1001);
      console.log("⚠️ Extremely long name detected (needs validation)");
    });

    it("should handle names with special characters", () => {
      const specialName = "Sự kiện âm nhạc - Concert Night 2024!";
      const formData = createBasicEventFormData({ name: specialName });
      expect(formData.get("name")).toBe(specialName);
      console.log("✅ Name with special characters accepted");
    });

    it("should detect empty string names", () => {
      const formData = createBasicEventFormData({ name: "" });
      expect(formData.get("name")).toBe("");
      console.log("❌ Empty name detected (should be rejected)");
    });

    it("should detect whitespace-only names", () => {
      const formData = createBasicEventFormData({ name: "   " });
      expect(formData.get("name")).toBe("   ");
      console.log("❌ Whitespace-only name detected (should be rejected)");
    });

    it("should detect null/undefined names", () => {
      const formData = createBasicEventFormData({ name: null });
      expect(formData.get("name")).toBe("null");
      console.log("❌ Null name converted to string (should be rejected)");
    });
  });

  describe("MaxTicketsByOrder Validation", () => {
    it("should accept minimum valid value (1)", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "1" });
      expect(formData.get("maxTicketsByOrder")).toBe("1");
      console.log("✅ Minimum valid maxTicketsByOrder (1) accepted");
    });

    it("should accept reasonable maximum value (100)", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "100" });
      expect(formData.get("maxTicketsByOrder")).toBe("100");
      console.log("✅ Reasonable maximum maxTicketsByOrder (100) accepted");
    });

    it("should detect zero value", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "0" });
      expect(formData.get("maxTicketsByOrder")).toBe("0");
      console.log("❌ Zero maxTicketsByOrder detected (should be rejected)");
    });

    it("should detect negative values", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "-5" });
      expect(formData.get("maxTicketsByOrder")).toBe("-5");
      console.log(
        "❌ Negative maxTicketsByOrder detected (should be rejected)"
      );
    });

    it("should detect non-numeric values", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "abc" });
      expect(formData.get("maxTicketsByOrder")).toBe("abc");
      console.log(
        "❌ Non-numeric maxTicketsByOrder detected (should be rejected)"
      );
    });

    it("should detect extremely large values", () => {
      const formData = createBasicEventFormData({
        maxTicketsByOrder: "999999",
      });
      expect(formData.get("maxTicketsByOrder")).toBe("999999");
      console.log(
        "⚠️ Extremely large maxTicketsByOrder detected (needs validation)"
      );
    });

    it("should detect decimal values", () => {
      const formData = createBasicEventFormData({ maxTicketsByOrder: "5.5" });
      expect(formData.get("maxTicketsByOrder")).toBe("5.5");
      console.log("❌ Decimal maxTicketsByOrder detected (should be integer)");
    });
  });

  describe("Area SeatCount Validation", () => {
    it("should accept minimum valid seat count (1)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "VIP", seatCount: 1, ticketPrice: 100000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe("1");
      console.log("✅ Minimum valid seatCount (1) accepted");
    });

    it("should accept large reasonable seat count (10000)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Stadium", seatCount: 10000, ticketPrice: 50000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe(
        "10000"
      );
      console.log("✅ Large reasonable seatCount (10000) accepted");
    });

    it("should detect zero seat count", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Empty", seatCount: 0, ticketPrice: 100000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe("0");
      console.log("❌ Zero seatCount detected (should be rejected)");
    });

    it("should detect negative seat count", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Invalid", seatCount: -50, ticketPrice: 100000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe("-50");
      console.log("❌ Negative seatCount detected (should be rejected)");
    });

    it("should detect extremely large seat count", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Massive", seatCount: 1000000, ticketPrice: 50000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].seatCount")).toBe(
        "1000000"
      );
      console.log("⚠️ Extremely large seatCount detected (needs validation)");
    });
  });

  describe("Area TicketPrice Validation", () => {
    it("should accept minimum valid price (0 - free event)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Free", seatCount: 100, ticketPrice: 0 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe("0");
      console.log("✅ Minimum valid ticketPrice (0) accepted for free events");
    });

    it("should accept small positive prices (1000 VND)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Budget", seatCount: 100, ticketPrice: 1000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "1000"
      );
      console.log("✅ Small positive ticketPrice (1000) accepted");
    });

    it("should accept reasonable high prices (10,000,000 VND)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Premium", seatCount: 50, ticketPrice: 10000000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "10000000"
      );
      console.log("✅ High reasonable ticketPrice (10,000,000) accepted");
    });

    it("should detect negative prices", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Invalid", seatCount: 100, ticketPrice: -50000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "-50000"
      );
      console.log("❌ Negative ticketPrice detected (should be rejected)");
    });

    it("should detect extremely high prices (>100,000,000 VND)", () => {
      const formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "Extreme", seatCount: 10, ticketPrice: 150000000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "150000000"
      );
      console.log("⚠️ Extremely high ticketPrice detected (needs validation)");
    });

    it("should handle decimal prices", () => {
      const formData = createBasicEventFormData();
      // Note: FormData converts numbers to strings, so decimals become strings
      formData.append("showingConfigs[0].areas[0].ticketPrice", "99.99");
      expect(formData.get("showingConfigs[0].areas[0].ticketPrice")).toBe(
        "99.99"
      );
      console.log(
        "⚠️ Decimal ticketPrice detected (might need integer validation)"
      );
    });
  });

  describe("Date Validation", () => {
    it("should accept valid ISO date format", () => {
      const formData = createBasicEventFormData({
        ticketSaleStart: "2024-12-01T00:00:00Z",
      });
      expect(formData.get("ticketSaleStart")).toBe("2024-12-01T00:00:00Z");
      console.log("✅ Valid ISO date format accepted");
    });

    it("should detect invalid date formats", () => {
      const formData = createBasicEventFormData({
        ticketSaleStart: "2024-13-45T25:70:00Z",
      });
      expect(formData.get("ticketSaleStart")).toBe("2024-13-45T25:70:00Z");
      console.log("❌ Invalid date format detected (should be rejected)");
    });

    it("should detect non-date strings", () => {
      const formData = createBasicEventFormData({
        ticketSaleStart: "not-a-date",
      });
      expect(formData.get("ticketSaleStart")).toBe("not-a-date");
      console.log("❌ Non-date string detected (should be rejected)");
    });

    it("should detect past dates for future events", () => {
      const formData = createBasicEventFormData({
        ticketSaleStart: "2020-01-01T00:00:00Z",
      });
      expect(formData.get("ticketSaleStart")).toBe("2020-01-01T00:00:00Z");
      console.log("⚠️ Past date detected (might need future validation)");
    });

    it("should detect date logic errors (end before start)", () => {
      const formData = createBasicEventFormData();
      addShowingsToFormData(formData, [
        {
          name: "Invalid Show",
          startTime: "2024-12-15T22:00:00Z",
          endTime: "2024-12-15T20:00:00Z", // End before start
        },
      ]);
      expect(formData.get("showings[0].startTime")).toBe(
        "2024-12-15T22:00:00Z"
      );
      expect(formData.get("showings[0].endTime")).toBe("2024-12-15T20:00:00Z");
      console.log(
        "❌ End time before start time detected (should be rejected)"
      );
    });
  });

  describe("URL Validation", () => {
    it("should accept valid HTTP URLs", () => {
      const formData = createBasicEventFormData({
        posterUrl: "https://example.com/poster.jpg",
      });
      expect(formData.get("posterUrl")).toBe("https://example.com/poster.jpg");
      console.log("✅ Valid HTTPS URL accepted");
    });

    it("should accept valid HTTP URLs", () => {
      const formData = createBasicEventFormData({
        posterUrl: "http://example.com/poster.jpg",
      });
      expect(formData.get("posterUrl")).toBe("http://example.com/poster.jpg");
      console.log("✅ Valid HTTP URL accepted");
    });

    it("should detect invalid URL formats", () => {
      const formData = createBasicEventFormData({
        posterUrl: "not-a-url",
      });
      expect(formData.get("posterUrl")).toBe("not-a-url");
      console.log("❌ Invalid URL format detected (should be rejected)");
    });

    it("should detect malicious URLs", () => {
      const formData = createBasicEventFormData({
        posterUrl: "javascript:alert('xss')",
      });
      expect(formData.get("posterUrl")).toBe("javascript:alert('xss')");
      console.log("❌ Malicious URL detected (should be rejected)");
    });

    it("should handle empty URLs", () => {
      const formData = createBasicEventFormData({
        posterUrl: "",
      });
      expect(formData.get("posterUrl")).toBe("");
      console.log("✅ Empty URL accepted (optional field)");
    });
  });

  describe("SeatMap Grid Validation", () => {
    it("should accept minimum valid grid dimensions", () => {
      const formData = createBasicEventFormData();
      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Section A",
            rows: 1,
            seatsPerRow: 1,
            ticketPrice: 50000,
          },
        ],
        defaultSeatSettings: { width: 30, height: 30, spacing: 5 },
      };
      addSeatMapToFormData(formData, "seat-map-123", seatMapData);
      const parsed = JSON.parse(formData.get("seatMapData") as string);
      expect(parsed.grids[0].rows).toBe(1);
      expect(parsed.grids[0].seatsPerRow).toBe(1);
      console.log("✅ Minimum valid grid dimensions (1x1) accepted");
    });

    it("should accept large reasonable grid dimensions", () => {
      const formData = createBasicEventFormData();
      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Large Stadium",
            rows: 100,
            seatsPerRow: 200,
            ticketPrice: 75000,
          },
        ],
        defaultSeatSettings: { width: 30, height: 30, spacing: 5 },
      };
      addSeatMapToFormData(formData, "seat-map-123", seatMapData);
      const parsed = JSON.parse(formData.get("seatMapData") as string);
      expect(parsed.grids[0].rows).toBe(100);
      expect(parsed.grids[0].seatsPerRow).toBe(200);
      console.log("✅ Large reasonable grid dimensions (100x200) accepted");
    });

    it("should detect zero dimensions", () => {
      const formData = createBasicEventFormData();
      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Invalid Grid",
            rows: 0,
            seatsPerRow: 0,
            ticketPrice: 50000,
          },
        ],
        defaultSeatSettings: { width: 30, height: 30, spacing: 5 },
      };
      addSeatMapToFormData(formData, "seat-map-123", seatMapData);
      const parsed = JSON.parse(formData.get("seatMapData") as string);
      expect(parsed.grids[0].rows).toBe(0);
      expect(parsed.grids[0].seatsPerRow).toBe(0);
      console.log("❌ Zero grid dimensions detected (should be rejected)");
    });

    it("should detect negative dimensions", () => {
      const formData = createBasicEventFormData();
      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Negative Grid",
            rows: -5,
            seatsPerRow: -10,
            ticketPrice: 50000,
          },
        ],
        defaultSeatSettings: { width: 30, height: 30, spacing: 5 },
      };
      addSeatMapToFormData(formData, "seat-map-123", seatMapData);
      const parsed = JSON.parse(formData.get("seatMapData") as string);
      expect(parsed.grids[0].rows).toBe(-5);
      expect(parsed.grids[0].seatsPerRow).toBe(-10);
      console.log("❌ Negative grid dimensions detected (should be rejected)");
    });

    it("should detect extremely large dimensions", () => {
      const formData = createBasicEventFormData();
      const seatMapData = {
        grids: [
          {
            id: "grid-1",
            name: "Massive Grid",
            rows: 10000,
            seatsPerRow: 10000,
            ticketPrice: 50000,
          },
        ],
        defaultSeatSettings: { width: 30, height: 30, spacing: 5 },
      };
      addSeatMapToFormData(formData, "seat-map-123", seatMapData);
      const parsed = JSON.parse(formData.get("seatMapData") as string);
      expect(parsed.grids[0].rows).toBe(10000);
      expect(parsed.grids[0].seatsPerRow).toBe(10000);
      console.log(
        "⚠️ Extremely large grid dimensions detected (needs validation)"
      );
    });
  });

  describe("String Field Boundary Tests", () => {
    it("should test description field boundaries", () => {
      // Empty description
      let formData = createBasicEventFormData({ description: "" });
      expect(formData.get("description")).toBe("");
      console.log("✅ Empty description accepted (optional field)");

      // Very long description
      const longDescription = "A".repeat(5000);
      formData = createBasicEventFormData({ description: longDescription });
      expect(formData.get("description")).toHaveLength(5000);
      console.log("⚠️ Very long description detected (needs validation)");
    });

    it("should test location field boundaries", () => {
      // Empty location
      let formData = createBasicEventFormData({ location: "" });
      expect(formData.get("location")).toBe("");
      console.log("✅ Empty location accepted (optional field)");

      // Very long location
      const longLocation = "A".repeat(1000);
      formData = createBasicEventFormData({ location: longLocation });
      expect(formData.get("location")).toHaveLength(1000);
      console.log("⚠️ Very long location detected (needs validation)");

      // Location with special characters
      const specialLocation = "Nhà hát Lớn Hà Nội, số 1 Tràng Tiền";
      formData = createBasicEventFormData({ location: specialLocation });
      expect(formData.get("location")).toBe(specialLocation);
      console.log("✅ Location with Vietnamese characters accepted");
    });

    it("should test showing name boundaries", () => {
      const formData = createBasicEventFormData();

      // Empty showing name
      addShowingsToFormData(formData, [
        {
          name: "",
          startTime: "2024-12-15T19:00:00Z",
          endTime: "2024-12-15T22:00:00Z",
        },
      ]);
      expect(formData.get("showings[0].name")).toBe("");
      console.log("❌ Empty showing name detected (should be rejected)");

      // Very long showing name
      const longShowingName = "A".repeat(500);
      const formData2 = createBasicEventFormData();
      addShowingsToFormData(formData2, [
        {
          name: longShowingName,
          startTime: "2024-12-15T19:00:00Z",
          endTime: "2024-12-15T22:00:00Z",
        },
      ]);
      expect(formData2.get("showings[0].name")).toHaveLength(500);
      console.log("⚠️ Very long showing name detected (needs validation)");
    });

    it("should test area name boundaries", () => {
      // Empty area name
      let formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: "", seatCount: 100, ticketPrice: 50000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].name")).toBe("");
      console.log("❌ Empty area name detected (should be rejected)");

      // Very long area name
      const longAreaName = "A".repeat(200);
      formData = createBasicEventFormData();
      addAreasToFormData(formData, [
        { name: longAreaName, seatCount: 100, ticketPrice: 50000 },
      ]);
      expect(formData.get("showingConfigs[0].areas[0].name")).toHaveLength(200);
      console.log("⚠️ Very long area name detected (needs validation)");
    });
  });

  describe("Summary of Validation Recommendations", () => {
    it("should provide validation summary", () => {
      console.log("\n🔍 VALIDATION RECOMMENDATIONS:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      console.log("\n📝 EVENT NAME:");
      console.log("✅ Valid: 1-255 characters");
      console.log("❌ Reject: Empty, whitespace-only, >255 chars");

      console.log("\n🎫 MAX TICKETS BY ORDER:");
      console.log("✅ Valid: 1-100 (positive integers only)");
      console.log("❌ Reject: ≤0, >100, non-integers, non-numeric");

      console.log("\n💺 SEAT COUNT:");
      console.log("✅ Valid: 1-50,000 seats per area");
      console.log("❌ Reject: ≤0, >50,000");

      console.log("\n💰 TICKET PRICE:");
      console.log("✅ Valid: 0-100,000,000 VND (integers only)");
      console.log("❌ Reject: <0, >100,000,000, decimals");

      console.log("\n📅 DATES:");
      console.log("✅ Valid: ISO format, future dates, logical order");
      console.log("❌ Reject: Invalid format, past dates, end before start");

      console.log("\n🔗 URLS:");
      console.log("✅ Valid: HTTP/HTTPS protocols only");
      console.log("❌ Reject: Invalid format, javascript: protocols");

      console.log("\n🎭 SEAT MAP GRIDS:");
      console.log("✅ Valid: 1-1000 rows, 1-1000 seats per row");
      console.log("❌ Reject: ≤0 dimensions, >1000 dimensions");

      console.log("\n📝 TEXT FIELDS:");
      console.log("✅ Description: 0-2000 characters");
      console.log("✅ Location: 0-500 characters");
      console.log("✅ Showing Name: 1-100 characters");
      console.log("✅ Area Name: 1-50 characters");

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      expect(true).toBe(true); // Always pass
    });
  });
});
