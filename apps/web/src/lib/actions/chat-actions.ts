"use server"

import { generateStreamToken } from "@/lib/stream-utils";
import { StreamChat } from "stream-chat";
import { getAuthSession } from "../auth/auth";
import { headers } from "next/headers";
import { User } from "@vieticket/db/models/users";
import { doesUserExist } from "@vieticket/repos/users";

export async function getStreamToken(): Promise<string> {
    const session = await getAuthSession(await headers());
    if (!session) {
        throw new Error('Unauthenticated')
    }

    const user = session.user as User;

    // If the user's role is admin, generate the token for the 'admin' user ID
    if (user.role === 'admin') {
        return await generateStreamToken({ ...user, id: 'admin' });
    }

    return await generateStreamToken(user);
}

export async function createChatRoom(recipientUserId: string) {
    try {
        const session = await getAuthSession(await headers());
        if (!session) {
            throw new Error('Unauthenticated')
        }
        const currentUser = session.user as User;

        // Determine the Stream ID for the current user based on their role
        const currentStreamId = currentUser.role === 'admin' ? 'admin' : currentUser.id;

        // Prevent a user from creating a chat with themselves
        if (currentStreamId === recipientUserId) {
            throw new Error("Cannot create a chat room with yourself.");
        }

        // Validate that the recipient user exists in your database if they aren't the admin
        if (recipientUserId !== 'admin') {
            const userExists = await doesUserExist(recipientUserId);
            if (!userExists) {
                throw new Error('Recipient user does not exist');
            }
        }

        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        const apiSecret = process.env.STREAM_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw Error("Stream credentials not configured");
        }

        // Initialize server-side Stream client
        const serverClient = StreamChat.getInstance(apiKey, apiSecret);

        // To ensure a consistent channel ID, sort the member IDs alphabetically and join them.
        // This prevents duplicate channels like 'userA-userB' and 'userB-userA'.
        const channelIdMembers = [currentStreamId, recipientUserId].sort();
        const channelId = channelIdMembers.join('-');

        const channel = serverClient.channel("messaging", channelId, {
            // The members array should contain the actual IDs of the participants
            members: [currentStreamId, recipientUserId],
            // created_by_id should be the Stream ID of the user initiating the action
            created_by_id: currentStreamId
        });

        // Create the channel on Stream's servers. This also updates it if it already exists.
        await channel.create();

        return channelId;
    } catch (error) {
        console.error("Error creating chat room:", error);
        // Re-throwing the original error can provide more specific client-side handling
        throw error;
    }
}
