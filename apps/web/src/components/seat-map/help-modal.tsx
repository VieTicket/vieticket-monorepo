import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKeyMap } from "./hooks/useKeyMap";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Button } from "../ui/button";
import { HelpCircle } from "lucide-react";

export const HelpModal: React.FC = () => {
  const { getShortcuts } = useKeyMap();
  const shortcuts = getShortcuts();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Tools</h3>
            <div className="space-y-2">
              {Object.entries(shortcuts.tools).map(([key, description]) => (
                <div key={key} className="flex justify-between items-cent">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {key}
                  </span>
                  <span className="text-sm">{description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              {Object.entries(shortcuts.actions).map(([key, description]) => (
                <div key={key} className="flex justify-between items-cent">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {key}
                  </span>
                  <span className="text-sm">{description}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Navigation</h3>
            <div className="space-y-2">
              {Object.entries(shortcuts.navigation).map(
                ([key, description]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                      {key}
                    </span>
                    <span className="text-sm">{description}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">File</h3>
            <div className="space-y-2">
              {Object.entries(shortcuts.file).map(([key, description]) => (
                <div key={key} className="flex justify-between items-cent">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {key}
                  </span>
                  <span className="text-sm">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
