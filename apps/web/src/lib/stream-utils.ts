"use server"

import { User } from "@vieticket/db/models/users";
import { StreamChat } from "stream-chat";

export async function generateStreamToken(user: User) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        const apiSecret = process.env.STREAM_API_SECRET;

        console.log("Stream credentials check:", { 
            hasApiKey: !!apiKey, 
            hasApiSecret: !!apiSecret 
        });

        if (!apiKey || !apiSecret) {
            throw Error("Stream credentials not configured");
        }

        // 2. Initialize the Stream server-side client
        const serverClient = StreamChat.getInstance(apiKey, apiSecret);

        // 3. Create or update the user in Stream
        const streamUser = {
            id: user.id,
            name: user.name || 'User',
            userType: user.role,
            image: user.image || undefined,
        };
        
        await serverClient.upsertUser(streamUser);

        // 4. Create a token for the user
        const token = serverClient.createToken(user.id);
        
        return token;
    } catch (error) {
        if (!(error instanceof Error)) {
            throw Error("Failed to generate chat token");
        }

        console.error("Error generating Stream token:", error);
        console.error("Error stack:", error.stack);
        
        throw Error("Failed to generate chat token");
    }
}