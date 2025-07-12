"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wand2, Download } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";
import { uploadFileToCloudinary } from "../ui/file-uploader";

interface AIImageGeneratorProps {
  type: "poster" | "banner";
  onImageGenerated: (imageUrl: string) => void;
  eventType?: string;
}

export function AIImageGenerator({
  type,
  onImageGenerated,
  eventType = "",
}: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState(
    "Modern abstract background with vibrant colorful lights, dynamic energy rays, professional event atmosphere, high-quality digital art, contemporary design elements, perfect for concert or entertainment events"
  );
  const [textPrompt, setTextPrompt] = useState("EVENT 2025"); // NEW
  const [style, setStyle] = useState("modern");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a background description");
      return;
    }

    setIsGenerating(true);

    try {
      const enhancedPrompt = createOptimizedPrompt(
        prompt,
        textPrompt,
        type,
        style,
        eventType
      );

      const encodedPrompt = encodeURIComponent(enhancedPrompt.normalize("NFC"));
      const seed = Math.floor(Math.random() * 100000000);
      const width = type === "poster" ? 600 : 1280;
      const height = type === "poster" ? 800 : 720;

      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&seed=${seed}&width=${width}&height=${height}&nologo=true`;

      console.log("🎯 Fetching image from:", imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Pollinations fetch failed");

      const blob = await response.blob();
      const base64 = await cropAndResizeImage(blob);
      setGeneratedImage(base64);

      toast.success(`AI ${type} generated successfully!`);
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error("Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createOptimizedPrompt = (
    background: string,
    text: string,
    type: "poster" | "banner",
    style: string,
    eventType: string
  ): string => {
    const basePrompt =
      type === "poster"
        ? "professional concert poster background, abstract, colorful lighting, high quality, 3:4 aspect ratio"
        : "professional wide banner with stage lights, abstract background, high quality, 16:9 ratio";

    const stylePrompts: Record<string, string> = {
      modern: "modern design, clean layout, geometric shapes",
      vibrant: "vivid colors, energetic patterns, dynamic background",
      elegant: "luxury design, golden gradient, high contrast",
      creative: "innovative layout, expressive brush strokes, visual depth",
      realistic:
        "realistic textures, DSLR quality, lifelike lighting, photography style",
      illustration:
        "cartoon look, stylized drawing, clean lines, hand-drawn shapes",
    };

    const formattedText = text
      ? `Overlay elegant, artistic typography with bold, stylish text: "${text}". Center aligned. Decorative font with clear readability. Professionally composed, balanced layout. High contrast for visual impact.`
      : "";

    const eventInfo = eventType
      ? `${eventType} event atmosphere`
      : "professional event atmosphere";

    return `${background}, ${eventInfo}, ${basePrompt}, ${stylePrompts[style]}, ${formattedText}, high resolution, digital art, professional quality`;
  };

  async function cropAndResizeImage(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const aspectRatio = type === "poster" ? 3 / 4 : 16 / 9;
        const width = img.width;
        const height = Math.round(width / aspectRatio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context error");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  const useGeneratedImage = async () => {
    if (!generatedImage) return;

    // 1. Gán ảnh base64 vào form ngay lập tức
    onImageGenerated(generatedImage);
    setGeneratedImage(null);
    toast.success("Image applied successfully!");

    // 2. Upload lên Cloudinary trong background (silent)
    try {
      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();

      // Create file from blob
      const file = new File([blob], `ai-${type}-${Date.now()}.png`, {
        type: "image/png",
      });

      // Upload to Cloudinary using shared utility
      const folder = type === "poster" ? "event-posters" : "event-banners";
      const result = await uploadFileToCloudinary(file, folder);

      // 3. Cập nhật lại với Cloudinary URL (thay thế base64)
      onImageGenerated(result.secure_url);

      // Không hiển thị toast cho background upload
    } catch (error) {
      console.error("Background upload to Cloudinary failed:", error);
      // Silent fail - user đã thấy ảnh, không cần thông báo lỗi upload
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `ai-${type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI {type === "poster" ? "Poster" : "Banner"} Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Background Prompt</Label>
          <Textarea
            placeholder={`Describe the background for your ${type}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Text on Image (Optional)</Label>
          <Input
            placeholder='Example: "LIVE MUSIC NIGHT 2025"'
            value={textPrompt}
            onChange={(e) => setTextPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Style</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
              <SelectItem value="elegant">Elegant</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="illustration">Illustration</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generateImage}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-3">
            <div className="border rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImage} alt="Generated" className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button onClick={useGeneratedImage} className="flex-1">
                Use This Image
              </Button>
              <Button variant="outline" onClick={downloadImage}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
