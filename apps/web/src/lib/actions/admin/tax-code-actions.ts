"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { headers as headersFn } from "next/headers";

export interface TaxCodeLookupResult {
  name: string;
  address: string;
  disclaimer: string;
}

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

export async function lookupTaxCodeAction(taxCode: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    // Check admin role
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can lookup tax codes.");
    }

    if (!taxCode || !taxCode.trim()) {
      return {
        success: false,
        error: "Tax code is required",
      };
    }

    // Call VietQR API directly from server
    const response = await fetch(
      `https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode.trim())}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: "Failed to lookup tax code",
      };
    }

    const data: VietQRBusinessResponse = await response.json();

    // Check if API returned an error
    if (data.code !== "00") {
      return {
        success: false,
        error: data.desc || "Tax code lookup failed",
        code: data.code,
      };
    }

    if (!data.data) {
      return {
        success: false,
        error: "No data returned from tax code lookup",
      };
    }

    // Extract only name, address, and disclaimer
    const result: TaxCodeLookupResult = {
      name: data.data.name,
      address: data.data.address,
      disclaimer: data.metadata?.disclaimer || "",
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error in lookupTaxCodeAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

