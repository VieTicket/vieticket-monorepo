"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { ImageResize } from "tiptap-extension-resize-image";

import { Toolbar } from "./TiptapToolbar";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
};

export default function TiptapEditorInput({ value, onChange, error }: Props) {
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
          "min-h-[200px] max-h-[300px] overflow-y-auto p-2 outline-none prose",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
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
  }, [value]);

  return (
    <div className="space-y-2">
      <label htmlFor="description">Additional Information</label>
      <div
        className={`border rounded ${error ? "border-red-500" : "border-gray-300"}`}
      >
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
