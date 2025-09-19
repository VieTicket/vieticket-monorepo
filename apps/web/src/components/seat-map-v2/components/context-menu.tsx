import React, { useEffect, useRef } from "react";
import { FolderPlus } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateEmptyContainer: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onCreateEmptyContainer,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Ensure menu stays within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 100);

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 py-1 min-w-[180px]"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      <button
        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
        onClick={() => {
          onCreateEmptyContainer();
          onClose();
        }}
      >
        <FolderPlus className="w-4 h-4 mr-2" />
        Create Empty Container
      </button>
    </div>
  );
};
