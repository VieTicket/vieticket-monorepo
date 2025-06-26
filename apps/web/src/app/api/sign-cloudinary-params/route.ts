import { authorise } from "@/lib/auth/authorise";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function scrambleUserId(userId: string): Promise<string> {
    // Use Web Crypto API (edge-safe)
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + process.env.CLOUDINARY_API_SECRET!);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert to hex string
    const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return hashHex.substring(0, 16); // Use first 16 characters
}

export async function POST(request: Request) {
    // This statement, if failed, will yell 500 INTERNAL SERVER ERROR
    // TODO: Create an global error handler for API routes
    // TODO: Create custom Error type for this kind of error
    const session = await authorise()

    const body = await request.json();
    const { paramsToSign } = body;

    // You can validate/modify the public_id here if needed
    if (paramsToSign.public_id) {
        // Use scrambled user ID instead of raw ID
        const scrambledId = await scrambleUserId(session.user.id);
        paramsToSign.public_id = `users-contents/${scrambledId}/${paramsToSign.public_id}`;
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    return Response.json({
        signature,
        api_key: process.env.CLOUDINARY_API_KEY!,
        ...paramsToSign,
    });
}