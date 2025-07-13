"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ChannelFilters, ChannelSort, StreamChat } from "stream-chat";
import {
    Channel,
    ChannelHeader,
    ChannelList,
    Chat,
    LoadingIndicator,
    MessageInput,
    MessageList,
    Window,
    useChatContext,
} from "stream-chat-react";

import "stream-chat-react/dist/css/v2/index.css";

interface ChatClientProps {
    apiKey: string;
    userId: string;
    token: string;
    channelId?: string;
}

const ResponsiveChatLayout = ({
    filters,
    sort,
    channelId,
}: {
    filters: ChannelFilters;
    sort: ChannelSort;
    channelId?: string;
}) => {
    const { channel } = useChatContext();

    return (
        <div className="flex h-full">
            <div
                className={`w-full border-r md:w-1/3 ${channel ? "hidden md:flex" : "flex"
                    } flex-col`}
            >
                <ChannelList
                    filters={filters}
                    sort={sort}
                    setActiveChannelOnMount={!!channelId}
                />
            </div>
            <div
                className={`w-full md:w-2/3 ${channel ? "flex" : "hidden md:flex"
                    } flex-col`}
            >
                <Channel>
                    <Window>
                        <ChannelHeader />
                        <MessageList />
                        <MessageInput />
                    </Window>
                </Channel>
            </div>
        </div>
    );
};

export function ChatClient({
    apiKey,
    userId,
    token,
    channelId,
}: ChatClientProps) {
    const [chatClient, setChatClient] = useState<StreamChat | null>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const client = new StreamChat(apiKey);
        let didAbort = false;

        const connectUser = async () => {
            try {
                await client.connectUser({ id: userId }, token);
                if (!didAbort) {
                    setChatClient(client);
                }
            } catch (error) {
                console.error("Error connecting user:", error);
            }
        };

        connectUser();

        return () => {
            didAbort = true;
            if (chatClient) {
                chatClient.disconnectUser();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey, userId, token]);

    const filters: ChannelFilters = {
        type: "messaging",
        members: { $in: [userId] },
    };

    const sort: ChannelSort = { last_message_at: -1 };

    if (!chatClient) {
        return <LoadingIndicator />;
    }

    return (
        <div style={{ height: "calc(100vh - 200px)" }}>
            <Chat
                client={chatClient}
                theme={theme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"}
            >
                <ResponsiveChatLayout
                    filters={filters}
                    sort={sort}
                    channelId={channelId}
                />
            </Chat>
        </div>
    );
}