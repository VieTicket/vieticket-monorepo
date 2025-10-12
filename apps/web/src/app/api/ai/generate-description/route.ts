import { streamTextFromGoogle } from "@vieticket/utils/ai/text-generator";
import { CoreMessage } from "ai";
import { getAuthSession } from "@/lib/auth/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const authSession = await getAuthSession(req.headers);

    if (!authSession?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { prompt, eventInfo }: { prompt: string; eventInfo: string } =
      await req.json();

    if (!prompt) {
      return new Response("Prompt is required", { status: 400 });
    }

    // Tạo system prompt và user message
    const systemPrompt = `You are an expert marketing copywriter for events. Your task is to generate a compelling, professional, and attractive event description in Vietnamese. The output must be pure, clean HTML using inline CSS for styling, without any markdown, code blocks, or explanations. Follow the user's specific creative requests and the provided HTML structure. Use emojis to make the description lively and engaging.`;

    const userMessages: CoreMessage[] = [
      {
        role: "user",
        content: eventInfo, // eventInfo is the detailed prompt you already built
      },
    ];

    // Gọi hàm utility và stream kết quả về client
    const result = await streamTextFromGoogle(
      "gemini-2.5-flash",
      systemPrompt,
      userMessages
    );

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[AI_GENERATE_DESCRIPTION_ERROR]", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
