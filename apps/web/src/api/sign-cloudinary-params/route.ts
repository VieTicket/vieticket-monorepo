import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paramsToSign } = body;

    // Sign the parameters
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp: paramsToSign.timestamp,
      public_id: paramsToSign.public_id,
      api_key: process.env.CLOUDINARY_API_KEY,
      // Include overwrite params in response if they were in the request
      ...(paramsToSign.overwrite && {
        overwrite: paramsToSign.overwrite,
        invalidate: paramsToSign.invalidate,
      }),
    });
  } catch (error) {
    console.error("Error signing Cloudinary params:", error);
    return NextResponse.json(
      { error: "Failed to sign parameters" },
      { status: 500 }
    );
  }
}
