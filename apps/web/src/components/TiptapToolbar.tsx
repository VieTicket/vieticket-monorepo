"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AITextGenerator } from "@/components/ai/AITextGenerator";

interface ToolbarProps {
  editor: Editor;
  eventData?: {
    name: string;
    type: string;
    startTime: string;
    endTime: string;
    location: string;
    ticketSaleStart: string;
    ticketSaleEnd: string;
    ticketPrice?: string;
  };
  onContentChange?: (content: string) => void; // NEW: callback to update parent
}

export function Toolbar({ editor, eventData, onContentChange }: ToolbarProps) {
  if (!editor) return null;

  const handleAITextGenerated = (htmlContent: string) => {
    console.log("🤖 AI Text Generated:", htmlContent.substring(0, 100) + "...");

    // Check if editor has existing content
    const currentContent = editor.getHTML();
    const isEmpty =
      currentContent === "<p></p>" ||
      currentContent === "" ||
      !currentContent.trim();

    let finalContent: string;

    if (isEmpty) {
      // Replace entire content if empty
      editor.chain().focus().setContent(htmlContent).run();
      finalContent = htmlContent;
      console.log("📝 Replaced empty content");
    } else {
      // Append to existing content
      const combinedContent = `${currentContent}<hr/>${htmlContent}`;
      editor.chain().focus().setContent(combinedContent).run();
      finalContent = combinedContent;
      console.log("📝 Appended to existing content");
    }

    // Immediately trigger onChange callback to update formData
    console.log(
      "🔄 Triggering onChange with content length:",
      finalContent.length
    );
    onContentChange?.(finalContent);

    // Also trigger editor's internal update as backup
    setTimeout(() => {
      const editorContent = editor.getHTML();
      if (editorContent !== finalContent) {
        console.log("🔄 Backup onChange triggered");
        onContentChange?.(editorContent);
      }
    }, 50);
  };

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      {/* AI Text Generator */}
      {eventData && (
        <div className="mr-2 border-r pr-2">
          <AITextGenerator
            eventData={eventData}
            onTextGenerated={handleAITextGenerated}
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "bg-gray-200" : ""}
      >
        <Bold size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "bg-gray-200" : ""}
      >
        <Italic size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive("underline") ? "bg-gray-200" : ""}
      >
        <Underline size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
      >
        <List size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
      >
        <ListOrdered size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      >
        <Link2 size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </Button>
    </div>
  );
}
