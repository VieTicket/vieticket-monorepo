import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/authorise";

interface VietQRBusinessData {
  id: string;
  name: string;
  internationalName?: string;
  shortName?: string;
  address: string;
  status?: string;
}

interface VietQRBusinessMetadata {
  disclaimer: string;
  source?: string;
  updatedAt?: string;
  contact?: string;
}

interface VietQRBusinessResponse {
  code: string;
  desc: string;
  data: VietQRBusinessData | null;
  metadata?: VietQRBusinessMetadata;
}

export async function GET(request: Request) {
  try {
    // Authorize admin access
    await authorise("admin");

    const { searchParams } = new URL(request.url);
    const taxCode = searchParams.get("taxCode");

    if (!taxCode) {
      return NextResponse.json(
        { error: "Tax code is required" },
        { status: 400 }
      );
    }

    // Call VietQR API
    const response = await fetch(
      `https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to lookup tax code" },
        { status: response.status }
      );
    }

    const data: VietQRBusinessResponse = await response.json();

    // Check if API returned an error
    if (data.code !== "00") {
      return NextResponse.json(
        {
          success: false,
          error: data.desc || "Tax code lookup failed",
          code: data.code,
        },
        { status: 200 } // Return 200 but with error in body
      );
    }

    // Extract only name, address, and disclaimer
    const result = {
      name: data.data?.name || "",
      address: data.data?.address || "",
      disclaimer: data.metadata?.disclaimer || "",
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error looking up tax code:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

