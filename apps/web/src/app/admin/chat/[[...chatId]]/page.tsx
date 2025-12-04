import React from "react";
import { ChatClient } from "@/components/chat/chat-client";
import { createChatRoom, getStreamToken } from "@/lib/actions/chat-actions";
import { getAuthSession } from "@/lib/auth/auth";
import { AdminChatHeader } from "@/components/chat/admin-chat-header";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin - Messages",
};

export default async function AdminChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId?: string[] }>;
  searchParams: Promise<{ recipientId?: string }>;
}) {
  const authSession = await getAuthSession(await headers());
  const user = authSession?.user;

  // Only allow admin access
  if (!user || user.role !== 'admin') {
    redirect('/sign-in');
  }

  const awaitedSearch = await searchParams;
  const channelIdParam = (await params).chatId?.[0];

  // Handle creating a new chat with a recipient
  if (awaitedSearch.recipientId) {
    let newChannelId: string;
    try {
      newChannelId = await createChatRoom(awaitedSearch.recipientId);
    } catch (error) {
      console.error("Unable to create or access admin chat room", error);
      redirect('/admin/chat');
    }
    redirect(`/admin/chat/${newChannelId}`);
  }

  // Generate a Stream token for admin
  const token = await getStreamToken();
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;

  if (!apiKey) {
    return <div>Error: Stream API key is not configured.</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <AdminChatHeader />

      <ChatClient
        apiKey={apiKey}
        userId="admin"
        token={token}
        channelId={channelIdParam}
      />
    </div>
  );
}
