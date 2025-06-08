// components/InputField.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps {
  label: string;
  type: string;
  placeholder: string;
  showToggle?: boolean;
}

export default function InputField({
  label,
  type,
  placeholder,
  showToggle = false,
}: InputProps) {
  const [show, setShow] = useState(false);
  const inputType = showToggle ? (show ? "text" : "password") : type;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          className="w-full border rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#2D2A39]"
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-2.5 text-gray-500"
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
    </div>
  );
}
