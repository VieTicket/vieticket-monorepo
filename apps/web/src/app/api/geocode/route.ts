import { NextRequest, NextResponse } from "next/server";

// Helper function to remove Vietnamese diacritics
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Helper function to create address variations
function createAddressVariations(address: string): string[] {
  const variations = new Set<string>();
  
  // Original
  variations.add(address.trim());
  
  // Add "Vietnam" or "Viet Nam"
  variations.add(`${address.trim()}, Vietnam`);
  variations.add(`${address.trim()}, Viet Nam`);
  
  // Remove commas and add Vietnam
  const noCommas = address.replace(/,/g, "").trim();
  variations.add(`${noCommas}, Vietnam`);
  
  // Without diacritics
  const withoutDiacritics = removeVietnameseDiacritics(address);
  variations.add(withoutDiacritics.trim());
  variations.add(`${withoutDiacritics.trim()}, Vietnam`);
  
  // Split by comma and try with "Vietnam" at the end
  const parts = address.split(",").map(p => p.trim()).filter(p => p);
  if (parts.length > 0) {
    variations.add(parts.join(", "));
    variations.add(`${parts.join(", ")}, Vietnam`);
  }
  
  // Try each part separately with Vietnam
  for (const part of parts) {
    variations.add(`${part}, Vietnam`);
  }
  
  return Array.from(variations);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Create address variations
    const addressVariations = createAddressVariations(address);

    // Try Nominatim API with each variation
    for (const addr of addressVariations) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&countrycodes=vn&addressdetails=1`,
          {
            headers: {
              "User-Agent": "VieTicket/1.0",
              "Accept-Language": "vi,en",
            },
          }
        );

        if (!response.ok) {
          console.warn(`Nominatim HTTP error for "${addr}": ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          // Validate coordinates
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            return NextResponse.json({
              success: true,
              lat,
              lng,
              address: data[0].display_name || addr,
              matchedQuery: addr,
            });
          }
        }
      } catch (error) {
        console.warn(`Error geocoding variation "${addr}":`, error);
        continue;
      }
    }

    // If Nominatim fails, try using Google Maps Geocoding via a public endpoint
    // Note: This is a workaround - ideally you should use Google Maps Geocoding API with API key
    try {
      // Try Google Maps geocoding via a proxy or direct call
      // Since we don't have API key, we'll just return error for now
      // But log that we tried Nominatim with all variations
      console.error(
        `Failed to geocode address "${address}" with all ${addressVariations.length} variations`
      );
    } catch (error) {
      console.error("Error in fallback geocoding:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Could not geocode address",
        triedVariations: addressVariations.length,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in geocode endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

