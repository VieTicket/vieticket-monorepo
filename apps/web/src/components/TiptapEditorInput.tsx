"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { ImageResize } from "tiptap-extension-resize-image";

import { Toolbar } from "./TiptapToolbar";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  validationError?: string;
  eventData?: {
    name: string;
    type: string;
    location: string;
    startTime: string;
    endTime: string;
    ticketSaleStart: string;
    ticketSaleEnd: string;
    ticketPrice?: string;
  };
};

// Maximum character limit for frontend validation (text content only)
const MAX_DESCRIPTION_LENGTH = 5000;

export default function TiptapEditorInput({
  value,
  onChange,
  error,
  validationError,
  eventData,
}: Props) {
  const t = useTranslations("organizer-dashboard.CreateEvent");

  // Function to extract text content from HTML
  const getTextContent = (html: string): string => {
    if (!html) return "";
    // Create a temporary div to extract text content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  // Calculate character count from text content
  const characterCount = useMemo(() => {
    return getTextContent(value).length;
  }, [value]);

  // Check if character limit is exceeded
  const isOverLimit = characterCount > MAX_DESCRIPTION_LENGTH;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link,
      ImageResize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false, // Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] sm:min-h-[200px] max-h-[250px] sm:max-h-[300px] overflow-y-auto p-2 sm:p-3 outline-none prose prose-sm sm:prose-base max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      const textContent = getTextContent(htmlContent);

      // Only call onChange if within character limit
      if (textContent.length <= MAX_DESCRIPTION_LENGTH) {
        onChange(htmlContent);
      }
      // If over limit, still update but the validation will catch it
      else {
        onChange(htmlContent);
      }
    },
    onCreate: ({ editor }) => {
      editor.view.dom.addEventListener("paste", (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith("image")) {
            const file = item.getAsFile();
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              editor
                .chain()
                .focus()
                .setImage({ src: base64 }) // use default image command
                .run();
            };
            reader.readAsDataURL(file);
          }
        }
      });
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="description"
          className="text-sm sm:text-base font-medium"
        >
          {t("labels.description")} *
        </label>
        <div className="flex items-center space-x-2 text-xs sm:text-sm">
          <span className={`${isOverLimit ? "text-red-500" : "text-gray-500"}`}>
            {characterCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}/
            {MAX_DESCRIPTION_LENGTH.toString().replace(
              /\B(?=(\d{3})+(?!\d))/g,
              ","
            )}
          </span>
          {isOverLimit && (
            <span className="text-red-500 font-medium">
              {t("errors.descriptionTooLong")}
            </span>
          )}
        </div>
      </div>
      <div
        className={`border rounded-md sm:rounded-lg ${
          error || isOverLimit ? "border-red-500" : "border-gray-300"
        } bg-white overflow-hidden`}
      >
        {editor && (
          <Toolbar
            editor={editor}
            eventData={eventData}
            onContentChange={onChange}
          />
        )}
        <EditorContent editor={editor} />
      </div>
      {(validationError || isOverLimit) && (
        <p className="text-red-500 text-xs mt-1">
          {validationError || t("errors.descriptionTooLong")}
        </p>
      )}
    </div>
  );
}
