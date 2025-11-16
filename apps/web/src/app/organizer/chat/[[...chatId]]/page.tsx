import { ChatClient } from "@/components/chat/chat-client";
import { createChatRoom, getStreamToken } from "@/lib/actions/chat-actions";
import { getAuthSession } from "@/lib/auth/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: `Nhắn tin`,
};

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId?: string[] }>;
  searchParams: Promise<{ recipientId?: string }>;
}) {
  const authSession = await getAuthSession(await headers());

  const user = authSession?.user;

  if (!user) {
    // Or redirect to your login page
    redirect("/sign-in"); 
  }

  const awaitedSearchParams = await searchParams;
  const channelId = (await params).chatId?.[0];

  if (awaitedSearchParams.recipientId) {
    let newChannelId;
    try {
      newChannelId = await createChatRoom(awaitedSearchParams.recipientId);
    } catch (error) {
      console.error("Failed to create or get chat room", error);
      // Redirect to base chat page on error
      redirect("/organizer/chat");
    }

    // Redirect after successfully creating the room
    redirect(`/organizer/chat/${newChannelId}`);
  }

  const token = await getStreamToken();
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

  if (!apiKey) {
    return <div>Error: Stream API key is not configured.</div>;
  }

  const t = await getTranslations("organizer-dashboard");

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("ChatWithAdmin.chat")}</h1>
        <p className="text-muted-foreground">{t("ChatWithAdmin.your_conversations")}</p>
      </div>

      <ChatClient
        apiKey={apiKey}
        userId={user.id}
        token={token}
        channelId={channelId}
      />
    </div>
  );
}