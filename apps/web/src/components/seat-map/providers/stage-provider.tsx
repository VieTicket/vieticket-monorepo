// Create: c:\IT\MyProjects\NextJS\vieticket-monorepo\apps\web\src\components\seat-map\context\StageContext.tsx
import React, { createContext, useContext, useRef } from "react";

interface StageContextType {
  stageRef: React.RefObject<any>;
}

const StageContext = createContext<StageContextType | null>(null);

export const StageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const stageRef = useRef<any>(null);

  return (
    <StageContext.Provider value={{ stageRef }}>
      {children}
    </StageContext.Provider>
  );
};

export const useStageRef = () => {
  const context = useContext(StageContext);
  if (!context) {
    throw new Error("useStageRef must be used within a StageProvider");
  }
  return context.stageRef;
};
