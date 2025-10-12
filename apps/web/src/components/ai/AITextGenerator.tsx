"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AITextGeneratorProps {
  eventData: {
    name: string;
    type: string;
    startTime: string;
    endTime: string;
    location: string;
    ticketSaleStart: string;
    ticketSaleEnd: string;
    ticketPrice?: string;
  };
  onTextGenerated: (html: string) => void;
}

export function AITextGenerator({
  eventData,
  onTextGenerated,
}: AITextGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle dialog open/close properly
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset states when closing
      setPrompt("");
      setIsGenerating(false);
    }
  };

  const createEventPrompt = (
    data: typeof eventData,
    userPrompt: string
  ): string => {
    const startDate = data.startTime
      ? new Date(data.startTime).toLocaleDateString("vi-VN")
      : "Sẽ thông báo";
    const startTime = data.startTime
      ? new Date(data.startTime).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Sẽ thông báo";
    const endDate = data.endTime
      ? new Date(data.endTime).toLocaleDateString("vi-VN")
      : "Sẽ thông báo";
    const endTime = data.endTime
      ? new Date(data.endTime).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Sẽ thông báo";

    return `Tạo mô tả sự kiện MARKETING chuyên nghiệp và CỰC KỲ HẤP DẪN bằng tiếng Việt cho:

🎯 THÔNG TIN SỰ KIỆN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ TÊN: ${data.name || "Chưa có tên"}
🎪 LOẠI: ${data.type || "Sự kiện"}  
📍 ĐỊA ĐIỂM: ${data.location || "Sẽ thông báo"}
⏰ THỜI GIAN: ${startDate} ${startTime} → ${endDate} ${endTime}
🎫 BÁN VÉ: ${data.ticketSaleStart ? new Date(data.ticketSaleStart).toLocaleDateString("vi-VN") : "Sẽ thông báo"} → ${data.ticketSaleEnd ? new Date(data.ticketSaleEnd).toLocaleDateString("vi-VN") : "Sẽ thông báo"}${data.ticketPrice ? `\n💰 GIÁ VÉ: ${parseInt(data.ticketPrice).toLocaleString("vi-VN")} VND` : ""}

🎨 YÊU CẦU ĐẶC BIỆT: ${userPrompt}

🔥 NHIỆM VỤ: Tạo mô tả sự kiện SIÊU HẤP DẪN theo mẫu bên dưới:

� CẤU TRÚC THEO MẪU MỚI (dựa trên ví dụ "ĐÊM NHẠC HUYỀN ẢO"):

1. 🎯 TIÊU ĐỀ CHÍNH hấp dẫn với emoji + tên sự kiện + slogan cảm xúc
   Ví dụ: "🔥 [TÊN SỰ KIỆN]: [Slogan hấp dẫn] – [Cảm xúc mạnh] Tại [Địa điểm]! 🔥"

2. 🌟 ĐOẠN MỞ ĐẦU tạo cảm xúc và FOMO (2-3 câu)
   - Tạo câu hỏi kích thích 
   - Mô tả trải nghiệm độc đáo
   - Kết thúc bằng lời kêu gọi hành động

3. 🎪 ĐIỂM NỔI BẬT (3-4 điểm quan trọng nhất)
   - Mỗi điểm bắt đầu bằng emoji + tiêu đề ngắn gọn
   - Mô tả chi tiết lợi ích/trải nghiệm
   - Sử dụng từ ngữ cảm xúc mạnh

4. � BẠN SẼ NHẬN ĐƯỢC (2-3 lợi ích cụ thể)
   - Ưu đãi cụ thể (giảm giá, quà tặng...)
   - Trải nghiệm độc quyền
   - Kỷ niệm/giá trị mang về

5. 🎯 CALL TO ACTION mạnh mẽ cuối bài
   - Tạo urgency với thời hạn cụ thể
   - Nhấn mạnh số lượng có hạn
   - Kêu gọi hành động ngay lập tức

💡 QUY TẮC VÀNG:
- Sử dụng NHIỀU EMOJIS để tạo điểm nhấn thị giác
- Tạo FOMO mạnh mẽ (Fear of Missing Out)
- Ngôn ngữ cảm xúc, năng động, trẻ trung
- Highlight các từ khóa quan trọng: GIẢM GIÁ, ĐỘC QUYỀN, SỐ LƯỢNG CÓ HẠN, NGAY, NHANH TAY
- Dài 200-300 từ, súc tích nhưng đầy đủ thông tin
- Kết thúc bằng lời kêu gọi hành động CỰC MẠNH

⚠️ QUAN TRỌNG: 
- Đây là nội dung TEXT THUẦN, KHÔNG PHẢI HTML hay Markdown
- Hệ thống sẽ tự động làm IN ĐẬM (bold) các từ khóa quan trọng như: ĐĂNG KÝ NGAY, GIẢM GIÁ, SỐ LƯỢNG CÓ HẠN, NGHỆ SĨ NỔI TIẾNG, TRẢI NGHIỆM, v.v.
- Tập trung vào nội dung hấp dẫn và cảm xúc mạnh
- Sử dụng nhiều từ khóa mạnh để hệ thống tự động highlight

CHỈ TRẢ VỀ NỘI DUNG TEXT, KHÔNG HTML!`;
  };

  // Sử dụng fetch trực tiếp thay vì useCompletion
  console.log("� Component rendered, prompt state:", prompt);

  // Clean up component
  const handleGenerateClick = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập yêu cầu cho phần mô tả");
      return;
    }

    setIsGenerating(true);

    try {
      const requestBody = {
        prompt: prompt,
        eventInfo: createEventPrompt(eventData, prompt),
      };

      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`API Error: ${errorText}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        toast.error("Không thể đọc response");
        return;
      }

      let fullResponse = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullResponse += chunk;
      }

      const htmlContent = convertToTipTapHTML(fullResponse);
      onTextGenerated(htmlContent);
      toast.success("Đã tạo mô tả sự kiện thành công!");
      handleOpenChange(false);
    } catch (error) {
      console.error("Error in API call:", error);
      toast.error("Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const convertToTipTapHTML = (text: string): string => {
    // Clean up the text
    let htmlContent = text.trim();

    // Remove markdown-style formatting if present
    htmlContent = htmlContent.replace(/```html\n?|```\n?/g, "");
    htmlContent = htmlContent.replace(/```\n?/g, "");

    // Convert markdown formatting to HTML
    // Handle bold text: **text** -> <strong>text</strong>
    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Handle italic text: *text* -> <em>text</em>
    htmlContent = htmlContent.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // If the response doesn't contain proper HTML structure, enhance it
    if (!htmlContent.includes("<h2") && !htmlContent.includes("style=")) {
      // This is plain text, let's structure it with beautiful styling
      const lines = htmlContent.split("\n").filter((line) => line.trim());

      if (lines.length > 0) {
        let styledContent = "";

        // First line as styled heading
        styledContent += `<h2 style="color: #2563eb; font-size: 28px; margin-bottom: 16px; text-align: center; font-weight: bold;">${lines[0]}</h2>`;

        // Process remaining content
        const remainingLines = lines.slice(1);
        let currentSection = "";

        remainingLines.forEach((line) => {
          if (line.includes("•") || line.includes("-") || line.includes("*")) {
            // This looks like a list item
            const cleanLine = line.replace(/^[•\-*]\s*/, "");
            currentSection += `<li style="background: linear-gradient(90deg, #fef3c7, #fbbf24); padding: 10px 15px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">✨ ${cleanLine}</li>`;
          } else if (line.length > 5) {
            // Regular paragraph
            if (currentSection.includes("<li")) {
              styledContent += `<ul style="list-style: none; padding: 0; margin: 20px 0;">${currentSection}</ul>`;
              currentSection = "";
            }
            styledContent += `<p style="font-size: 16px; color: #374151; margin: 15px 0; line-height: 1.6;">${line}</p>`;
          }
        });

        // Close any remaining list
        if (currentSection.includes("<li")) {
          styledContent += `<ul style="list-style: none; padding: 0; margin: 20px 0;">${currentSection}</ul>`;
        }

        // Add call to action
        styledContent += `<div style="text-align: center; margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">🎯 ĐĂNG KÝ NGAY - CHƯƠNG TRÌNH HẤP DẪN!</p>
        </div>`;

        htmlContent = styledContent;
      }
    }

    // Clean up multiple spaces and empty elements
    htmlContent = htmlContent.replace(/<p>\s*<\/p>/g, "");
    htmlContent = htmlContent.replace(/\s{2,}/g, " ");
    htmlContent = htmlContent.replace(/>\s+</g, "><");

    return htmlContent;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700 font-medium"
        >
          <Sparkles className="h-4 w-4" />✨ AI Description
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
              Tạo Mô Tả Sự Kiện Bằng AI
            </span>
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            💡 Nhập yêu cầu cụ thể để AI tạo nội dung marketing hấp dẫn với màu
            sắc và styling đẹp mắt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview event info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-5 rounded-xl shadow-sm">
            <h4 className="font-bold text-base mb-4 text-blue-800 flex items-center gap-2">
              🎯 Thông tin sự kiện hiện tại
            </h4>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-medium">Tên:</span>
                    <span className="text-blue-600 font-semibold">
                      {eventData.name || "Chưa có tên"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="font-medium">Loại:</span>
                    <span className="text-green-600 font-semibold">
                      {eventData.type || "Chưa xác định"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span className="font-medium">Địa điểm:</span>
                    <span className="text-orange-600 font-semibold">
                      {eventData.location || "Chưa xác định"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="font-medium">Bắt đầu:</span>
                    <span className="text-purple-600 font-semibold">
                      {eventData.startTime
                        ? new Date(eventData.startTime).toLocaleString("vi-VN")
                        : "Chưa xác định"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="font-medium">Kết thúc:</span>
                    <span className="text-red-600 font-semibold">
                      {eventData.endTime
                        ? new Date(eventData.endTime).toLocaleString("vi-VN")
                        : "Chưa xác định"}
                    </span>
                  </div>
                  {eventData.ticketPrice && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      <span className="font-medium">Giá vé:</span>
                      <span className="text-yellow-600 font-bold">
                        {parseInt(eventData.ticketPrice).toLocaleString(
                          "vi-VN"
                        )}{" "}
                        VND
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Input Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <span className="text-white font-bold text-sm">✨</span>
              </div>
              <Label
                htmlFor="prompt"
                className="text-lg font-semibold text-gray-800"
              >
                🎨 Yêu cầu sáng tạo cho mô tả
              </Label>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log("🔄 Prompt changing:", newValue);
                  setPrompt(newValue);
                }}
                placeholder="💡 Ví dụ sáng tạo:
• Nhấn mạnh cơ hội networking độc đáo
• Giới thiệu diễn giả/nghệ sĩ nổi tiếng  
• Tạo FOMO với số lượng vé giới hạn
• Highlight trải nghiệm độc quyền
• Nhắc đến ưu đãi early bird
• Tạo không khí sôi động, trẻ trung
• Nhấn mạnh giá trị học hỏi/giải trí..."
                rows={6}
                className="resize-none border-0 bg-white/70 backdrop-blur-sm text-base leading-relaxed shadow-sm"
              />

              <div className="mt-3 flex items-start gap-2">
                <div className="p-1 bg-blue-100 rounded-full">
                  <span className="text-blue-600 text-xs">💡</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <strong>Mẹo:</strong> Càng cụ thể thì AI sẽ tạo nội dung càng
                  hấp dẫn và phù hợp! Hãy mô tả chi tiết về điểm độc đáo, đối
                  tượng mục tiêu, và cảm xúc bạn muốn tạo ra.
                </p>
              </div>
            </div>

            {/* Creative Suggestions */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                🚀 Gợi ý sáng tạo:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-purple-700">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Tạo urgency với &quot;Chỉ còn X vé&quot;
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Nhấn mạnh exclusive experience
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Highlight celebrity/expert guests
                </div>
                <div className="flex items-center gap-2 text-purple-700">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  Social proof & testimonials
                </div>
              </div>
            </div>

            {/* Example Templates */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <h5 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                📝 Template mẫu (click để copy):
              </h5>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "Tạo không khí sôi động cho giới trẻ, nhấn mạnh cơ hội networking độc đáo, có diễn giả nổi tiếng trong ngành, trải nghiệm học hỏi thực tế, giá vé ưu đãi sớm, số lượng có hạn chỉ 200 vé"
                    )
                  }
                  className="w-full text-left p-2 bg-white/70 rounded border hover:bg-white text-sm text-amber-700"
                >
                  🎯 <strong>Sự kiện học tập/workshop:</strong> Networking +
                  Expert + Limited tickets
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "Đêm nhạc đỉnh cao với nghệ sĩ nổi tiếng, âm thanh ánh sáng hoành tráng, không gian lãng mạn cho couples, early bird giảm 30%, trải nghiệm âm nhạc không thể quên"
                    )
                  }
                  className="w-full text-left p-2 bg-white/70 rounded border hover:bg-white text-sm text-amber-700"
                >
                  🎵 <strong>Concert/Nhạc:</strong> Celebrity artist + Romantic
                  + Early bird discount
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "Hội thảo công nghệ với chuyên gia hàng đầu, insights độc quyền về AI/Tech trends, cơ hội kết nối startup, demo sản phẩm mới, gift bag giá trị cho tất cả participants"
                    )
                  }
                  className="w-full text-left p-2 bg-white/70 rounded border hover:bg-white text-sm text-amber-700"
                >
                  💻 <strong>Tech Conference:</strong> Expert insights + Startup
                  networking + Exclusive demos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      "Sự kiện âm nhạc huyền ảo bùng cháy cảm xúc, nghệ sĩ nổi tiếng, hệ thống âm thanh ánh sáng hoành tráng, không gian lãng mạn dành cho couples, ưu đãi early bird giảm 30%, trải nghiệm không thể quên"
                    )
                  }
                  className="w-full text-left p-2 bg-white/70 rounded border hover:bg-white text-sm text-amber-700"
                >
                  🔥 <strong>Đêm nhạc huyền ảo:</strong> Bùng cháy cảm xúc +
                  Nghệ sĩ nổi tiếng + Early bird 30%
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex gap-3">
          {/* Debug info - chỉ hiện khi development */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-gray-500 flex-1 space-y-1">
              <div>Debug: prompt="{prompt}"</div>
              <div>
                length={prompt.length} | trimmed="{prompt.trim()}" |
                trim().length={prompt.trim().length}
              </div>
              <div>
                isGenerating={isGenerating.toString()} | !prompt.trim()=
                {(!prompt.trim()).toString()}
              </div>
              <div>disabled={(isGenerating || !prompt.trim()).toString()}</div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
            className="flex-1"
          >
            ❌ Hủy
          </Button>

          {/* Test button để debug */}
          {process.env.NODE_ENV === "development" && (
            <Button
              type="button"
              onClick={() => {
                console.log("🧪 Test button clicked!");
                alert("Test button works!");
              }}
              className="bg-red-500 text-white px-2 py-1 text-xs"
            >
              Test
            </Button>
          )}

          <Button
            type="button"
            onClick={(e) => {
              console.log("🎯 Button onClick triggered");
              handleGenerateClick(e);
            }}
            onMouseDown={() => console.log("🖱️ Button mouseDown")}
            onMouseUp={() => console.log("🖱️ Button mouseUp")}
            disabled={isGenerating || !prompt.trim()}
            className="flex-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              pointerEvents: isGenerating || !prompt.trim() ? "none" : "auto",
              position: "relative",
              zIndex: 10,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                🎨 Đang tạo magic...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Tạo Mô Tả Siêu Hấp Dẫn
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
