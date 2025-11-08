import React, { useState, useEffect } from "react";
import { CommonTools } from "./toolbar/common-tools";
import { RightSideTools } from "./toolbar/right-side-tools";
import { ImportDialog } from "./toolbar/import-dialog";
import { UploadDialog } from "./toolbar/upload-dialog";

export const MainToolbar = () => {
  return (
    <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-2 shadow z-10">
      <div className="flex items-center gap-2">
        <CommonTools />
      </div>

      {/* Right Side Tools */}
      <RightSideTools />

      {/* Dialogs */}
      <ImportDialog />
      <UploadDialog />
    </div>
  );
};
