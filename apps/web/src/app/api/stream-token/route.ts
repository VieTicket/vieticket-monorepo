import { authorise } from "@/lib/auth/authorise";
import { StreamChat } from "stream-chat";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const apiSecret = process.env.STREAM_API_SECRET!;

export async function GET(req: NextRequest) {

    const session = await authorise(["admin", "organizer"]);

    const user = {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image || undefined,
    };

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    // Upsert the user in Stream before creating a token
    await serverClient.upsertUser(user);

    const token = serverClient.createToken(user.id);

    return NextResponse.json({ token, user });
}