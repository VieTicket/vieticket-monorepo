import React from "react";
import { Card, CardContent } from "../../ui/card";
import { StyleTab } from "./style-tab";
import { TextTab } from "./text-tab";
import { TransformTab } from "./transform-tab";
import { SingleShapeEditor } from "./single-shape-editor";
import { AreaSettingsCard } from "../area-sidebar/area-settings-card";
import { Shape } from "@/types/seat-map-types";

interface MainSidebarTabsProps {
  activeTab: "props" | "style" | "text" | "transform";
  setActiveTab: (tab: "props" | "style" | "text" | "transform") => void;
  selectedShapes: Shape[];
  singleShape: Shape | null;
  isPolygonSelected: boolean;
  batchValues: Record<string, any>;
  singleShapeBatchValues: Record<string, any>;
  handlers: any;
  isSingleShape: boolean;
}

export function MainSidebarTabs({
  activeTab,
  setActiveTab,
  selectedShapes,
  singleShape,
  isPolygonSelected,
  batchValues,
  singleShapeBatchValues,
  handlers,
  isSingleShape,
}: MainSidebarTabsProps) {
  return (
    <>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-4">
        {isSingleShape && (
          <button
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "props"
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("props")}
          >
            Props
          </button>
        )}
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "style"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("style")}
        >
          Style
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "text"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "transform"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("transform")}
        >
          Transform
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            {activeTab === "props" && isSingleShape && (
              <SingleShapeEditor
                shape={singleShape!}
                onUpdate={handlers.handleSingleShapeUpdate}
                onSave={handlers.saveToHistory}
              />
            )}

            {activeTab === "style" && (
              <StyleTab
                selectedShapes={selectedShapes}
                batchValues={
                  isSingleShape ? singleShapeBatchValues : batchValues
                }
                onBatchChange={
                  isSingleShape
                    ? (key, value) => {
                        handlers.handleSingleShapeUpdate({ [key]: value });
                        handlers.saveToHistory();
                      }
                    : handlers.handleBatchChange
                }
              />
            )}

            {activeTab === "text" && (
              <TextTab
                selectedShapes={selectedShapes}
                batchValues={
                  isSingleShape ? singleShapeBatchValues : batchValues
                }
                onBatchChange={
                  isSingleShape
                    ? (key, value) => {
                        handlers.handleSingleShapeUpdate({ [key]: value });
                        handlers.saveToHistory();
                      }
                    : handlers.handleBatchChange
                }
              />
            )}

            {activeTab === "transform" && (
              <TransformTab
                selectedShapes={selectedShapes}
                updateMultipleShapes={
                  isSingleShape
                    ? (updates) => {
                        if (updates.length > 0) {
                          handlers.handleSingleShapeUpdate(updates[0].updates);
                        }
                      }
                    : handlers.updateMultipleShapes
                }
                saveToHistory={handlers.saveToHistory}
              />
            )}
          </CardContent>
        </Card>
        {activeTab === "props" && isSingleShape && isPolygonSelected && (
          <AreaSettingsCard
            shape={singleShape} // FIX: Pass the polygon shape
            handlers={{
              handleAreaUpdate: (updates: any) => {
                handlers.handleSingleShapeUpdate(updates);
                handlers.saveToHistory();
              },
            }}
          />
        )}
      </div>
    </>
  );
}
