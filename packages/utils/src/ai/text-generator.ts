import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, streamText } from "ai";

// Khởi tạo một lần duy nhất để tái sử dụng
const google = createGoogleGenerativeAI({
  // apiKey được tự động đọc từ process.env.GOOGLE_API_KEY
});

/**
 * Tạo nội dung văn bản streaming sử dụng Google Gemini.
 * @param model - Tên model của Gemini (ví dụ: 'gemini-1.5-flash-latest').
 * @param systemPrompt - Hướng dẫn cho AI về vai trò và định dạng output.
 * @param userMessages - Mảng các tin nhắn từ người dùng.
 * @returns Một đối tượng ReadableStream chứa nội dung do AI tạo ra.
 */
export function streamTextFromGoogle(
  model: string,
  systemPrompt: string,
  userMessages: CoreMessage[]
) {
  const modelInstance = google(model);

  return streamText({
    model: modelInstance,
    system: systemPrompt,
    messages: userMessages,
  });
}
