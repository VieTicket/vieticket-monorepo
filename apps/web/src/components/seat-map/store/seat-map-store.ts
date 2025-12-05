import { create } from "zustand";
import { CanvasItem, ImageShape, SeatShape } from "../types";
import { isEqual } from "lodash";
import { getSelectionTransform } from "../events/transform-events";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import { getCustomerEventManager } from "../events/event-manager-customer";

export interface ShapeContext {
  topLevel: Array<{ id: string; type?: string; parentId: string | null }>;
  nested: Array<{ id: string; type?: string; parentId: string | null }>;
  operation?: string;
  containerPositions?: Record<string, { x: number; y: number }>;
  moveContext?: {
    itemId: string;
    fromParentId: string | null;
    toParentId: string | null;
    originalPosition: { x: number; y: number };
  };
}

export interface UndoRedoAction {
  id: string;
  timestamp: number;
  data: {
    before: {
      shapes?: CanvasItem[];
      selectedShapes?: CanvasItem[];
      affectedIds?: string[];
      context?: ShapeContext;
    };
    after: {
      shapes?: CanvasItem[];
      selectedShapes?: CanvasItem[];
      affectedIds?: string[];
      context?: ShapeContext;
    };
  };
}

export interface SeatMapInfo {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  createdAt: string;
  updatedAt: string;
  draftedFrom?: string;
  originalCreator?: string;
  shapes?: CanvasItem[];
}

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  joinedAt: Date;
  socketId?: string;
}

interface CollaborationState {
  userId: string;
  isConnected: boolean;
  roomUsers: UserInfo[];
}

export interface CustomerSeatInfo {
  seatId: string;
  areaName: string;
  rowName: string;
  seatNumber: string;
  price: number;
  status: "available" | "selected" | "held" | "sold";
  position?: { x: number; y: number };
  shape?: SeatShape;
}

export interface CustomerOrderSummary {
  selectedSeats: CustomerSeatInfo[];
  totalSeats: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  estimatedHoldTime?: number;
}

interface CustomerState {
  customerSelectedSeatIds: string[];
  customerSelectedSeatsInfo: CustomerSeatInfo[];
  customerOrderSummary: CustomerOrderSummary;

  customerIsSelecting: boolean;
  customerMaxSeatsAllowed: number;
  customerMinSeatsRequired: number;
  customerHoveredSeatId: string | null;

  customerSeatStatusMap: Record<
    string,
    "available" | "selected" | "held" | "sold"
  >;
  customerLastSelectionTime: number | null;

  customerEventData: {
    eventId?: string;
    eventName?: string;
    eventLocation?: string;
    seatingStructure?: any[];
    seatStatusData?: {
      paidSeatIds: string[];
      activeHoldSeatIds: string[];
    };
  };
}

let applyDeltaRestoreRef:
  | ((action: UndoRedoAction, isUndo: boolean) => Promise<void>)
  | null = null;

export const setApplyDeltaRestoreReference = (
  fn: (action: UndoRedoAction, isUndo: boolean) => Promise<void>
) => {
  applyDeltaRestoreRef = fn;
};

const HISTORY_STORAGE_KEY = (seatMapId: string) =>
  `seatmap_history_${seatMapId}`;
const HISTORY_INDEX_STORAGE_KEY = (seatMapId: string) =>
  `seatmap_history_index_${seatMapId}`;

const saveHistoryToStorage = (
  seatMapId: string,
  historyStack: UndoRedoAction[],
  currentIndex: number
) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const serializedHistory = historyStack.map((action) => ({
        ...action,
      }));
      console.log("Serialized history for storage:", serializedHistory);
      localStorage.setItem(
        HISTORY_STORAGE_KEY(seatMapId),
        JSON.stringify(serializedHistory)
      );
      localStorage.setItem(
        HISTORY_INDEX_STORAGE_KEY(seatMapId),
        currentIndex.toString()
      );

      console.log(
        `💾 Saved ${historyStack.length} actions to localStorage for seat map ${seatMapId}`
      );
    }
  } catch (error) {
    console.warn("Failed to save history to localStorage:", error);
  }
};

export const loadHistoryFromStorage = (
  seatMapId: string
): { historyStack: UndoRedoAction[]; currentIndex: number } | null => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const historyData = localStorage.getItem(HISTORY_STORAGE_KEY(seatMapId));
      const indexData = localStorage.getItem(
        HISTORY_INDEX_STORAGE_KEY(seatMapId)
      );

      if (historyData && indexData) {
        const historyStack = JSON.parse(historyData) as UndoRedoAction[];
        const currentIndex = parseInt(indexData, 10);

        console.log(
          `📥 Loaded ${historyStack.length} actions from localStorage for seat map ${seatMapId}`
        );
        return { historyStack, currentIndex };
      }
    }
  } catch (error) {
    console.warn("Failed to load history from localStorage:", error);
  }
  return null;
};

const clearHistoryFromStorage = (seatMapId: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(HISTORY_STORAGE_KEY(seatMapId));
      localStorage.removeItem(HISTORY_INDEX_STORAGE_KEY(seatMapId));
      console.log(
        `🗑️ Cleared history from localStorage for seat map ${seatMapId}`
      );
    }
  } catch (error) {
    console.warn("Failed to clear history from localStorage:", error);
  }
};

export const cloneCanvasItem = (item: CanvasItem): CanvasItem => {
  const cloned = {} as CanvasItem;

  for (const [key, value] of Object.entries(item)) {
    if (
      typeof value === "function" ||
      key === "graphics" ||
      key === "container" ||
      key === "sprite" ||
      key === "texture" ||
      key === "_bounds" ||
      key === "_mask" ||
      key === "parent" ||
      key === "filters" ||
      key === "hitArea" ||
      key === "cursor" ||
      key === "seatGraphics" ||
      key === "labelGraphics" ||
      (typeof value === "object" &&
        value !== null &&
        (value.constructor?.name?.includes("PIXI") ||
          value.constructor?.name?.includes("Graphics") ||
          value.constructor?.name?.includes("Container") ||
          value.constructor?.name?.includes("Sprite") ||
          value.constructor?.name?.includes("Text")))
    ) {
      continue;
    }

    if (key === "children" && Array.isArray(value)) {
      (cloned as any)[key] = value.map((child) => {
        if (typeof child === "object" && child !== null) {
          return cloneCanvasItem(child);
        }
        return child;
      });
    } else if (Array.isArray(value)) {
      (cloned as any)[key] = value.map((item) =>
        typeof item === "object" && item !== null ? { ...item } : item
      );
    } else if (typeof value === "object" && value !== null) {
      if (value.constructor === Object) {
        (cloned as any)[key] = { ...value };
      }
    } else {
      (cloned as any)[key] = value;
    }
  }

  return cloned;
};

export const cloneCanvasItems = (items: CanvasItem[]): CanvasItem[] => {
  return items.map(cloneCanvasItem);
};

interface SeatMapStore {
  seatMap: SeatMapInfo | null;
  isLoading: boolean;
  shapes: CanvasItem[];
  selectedShapes: CanvasItem[];

  historyStack: UndoRedoAction[];
  currentHistoryIndex: number;

  collaboration: CollaborationState;

  customer: CustomerState;

  setSeatMap: (seatMap: SeatMapInfo | null) => void;
  setLoading: (loading: boolean) => void;
  restoreHistoryFromStorage: (seatMapId: string) => boolean;
  clearStoredHistory: () => void;
  setHistory: (
    historyStack: UndoRedoAction[],
    currentHistoryIndex: number
  ) => void;

  updateShapes: (
    newShapes: CanvasItem[],
    saveHistory?: boolean,
    context?: ShapeContext,
    broadcastToOthers?: boolean
  ) => void;
  setSelectedShapes: (shapes: CanvasItem[], saveHistory?: boolean) => void;
  addShape: (shape: CanvasItem) => void;
  modifyShapes: (shapesToModify: CanvasItem[]) => void;
  deleteShape: (shapeId: string) => void;
  deleteShapes: (originalShapes?: CanvasItem[]) => void;

  selectAll: () => void;
  clearSelection: () => void;

  undo: () => UndoRedoAction | null;
  redo: () => UndoRedoAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  setCollaboration: (userId: string, isConnected: boolean) => void;
  updateRoomUsers: (users: UserInfo[]) => void;
  addRoomUser: (user: UserInfo) => void;
  removeRoomUser: (userId: string) => void;
  applyRemoteChange: (change: UndoRedoAction, fromUserId: string) => void;

  updateImageUploadState: (
    imageId: string,
    uploadState: "uploading" | "uploaded" | "failed",
    cloudinaryUrl?: string
  ) => void;
  saveDirectHistory: (
    beforeShapes: CanvasItem[],
    afterShapes: CanvasItem[],
    updateStore?: boolean
  ) => void;
  syncWithServerPendingChanges: () => void;
  _saveToHistory: (
    beforeState: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
      context: ShapeContext;
    }>,
    afterState?: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
      context: ShapeContext;
    }>,
    existingAction?: UndoRedoAction
  ) => UndoRedoAction;
  _findAffectedShapes: (
    oldShapes: CanvasItem[],
    newShapes: CanvasItem[]
  ) => { before: CanvasItem[]; after: CanvasItem[]; affectedIds: string[] };

  customerInitializeEventData: (eventData: {
    eventId: string;
    eventName: string;
    eventLocation: string;
    customerMaxSeatsAllowed: number;
    seatingStructure: any[];
    seatStatusData: {
      paidSeatIds: string[];
      activeHoldSeatIds: string[];
    };
  }) => void;
  customerToggleSeatSelection: (seatId: string) => boolean;
  customerSelectSeat: (seatId: string) => boolean;
  customerDeselectSeat: (seatId: string) => boolean;
  customerClearAllSelections: () => void;
  customerSetHoveredSeat: (seatId: string | null) => void;
  customerGetSeatStatus: (
    seatId: string
  ) => "available" | "selected" | "held" | "sold";
  customerUpdateSeatStatusMap: (
    statusMap: Record<string, "available" | "selected" | "held" | "sold">
  ) => void;
  customerSetSelectionLimits: (min: number, max: number) => void;
  customerCanSelectMoreSeats: () => boolean;
  customerGetOrderSummary: () => CustomerOrderSummary;
  customerFindSeatInfoById: (seatId: string) => CustomerSeatInfo | null;
  customerGetSelectedSeatsGroupedByArea: () => Record<
    string,
    CustomerSeatInfo[]
  >;
  customerCalculateTotalPrice: () => number;
  customerValidateSelection: () => { isValid: boolean; errors: string[] };
  customerResetState: () => void;
}

export const useSeatMapStore = create<SeatMapStore>((set, get) => ({
  seatMap: null,
  isLoading: false,
  shapes: [],
  selectedShapes: [],
  historyStack: [],
  currentHistoryIndex: -1,
  collaboration: {
    userId: "",
    isConnected: false,
    roomUsers: [],
  },

  customer: {
    customerSelectedSeatIds: [],
    customerSelectedSeatsInfo: [],
    customerOrderSummary: {
      selectedSeats: [],
      totalSeats: 0,
      subtotal: 0,
      serviceFee: 0,
      total: 0,
    },
    customerIsSelecting: false,
    customerMaxSeatsAllowed: 10,
    customerMinSeatsRequired: 1,
    customerHoveredSeatId: null,
    customerSeatStatusMap: {},
    customerLastSelectionTime: null,
    customerEventData: {},
  },

  setSeatMap: (seatMap: SeatMapInfo | null) => {
    const currentSeatMap = get().seatMap;

    if (!currentSeatMap && !seatMap) return;

    if (currentSeatMap && seatMap && currentSeatMap.id !== seatMap.id) {
      set({
        historyStack: [],
        currentHistoryIndex: -1,
      });
    }

    set({ seatMap });
  },

  setLoading: (loading: boolean) => {
    const currentLoading = get().isLoading;
    if (currentLoading === loading) return;
    set({ isLoading: loading });
  },

  updateShapes: (
    newShapes: CanvasItem[],
    saveHistory: boolean = true,
    context: ShapeContext = {
      topLevel: [],
      nested: [],
      operation: "modify",
    },
    broadcastToOthers: boolean = true
  ) => {
    const currentShapes = get().shapes;
    const currentSelected = cloneCanvasItems(get().selectedShapes);

    let action: UndoRedoAction | null = null;

    const { before, after, affectedIds } = get()._findAffectedShapes(
      currentShapes,
      newShapes
    );

    if (affectedIds.length > 0) {
      action = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: {
          before: {
            shapes: before,
            selectedShapes: currentSelected,
            affectedIds,
            context,
          },
          after: {
            shapes: after,
            selectedShapes: currentSelected,
            affectedIds,
            context,
          },
        },
      };

      if (saveHistory) {
        get()._saveToHistory(
          { shapes: before, selectedShapes: currentSelected, context },
          { shapes: after, selectedShapes: currentSelected, context },
          action
        );
      }
    }
    set({ shapes: [...newShapes] });

    if (broadcastToOthers && get().collaboration.isConnected && action) {
      SeatMapCollaboration.broadcastShapeChange(action);
    }
  },

  setSelectedShapes: (shapes: CanvasItem[], saveHistory: boolean = false) => {
    const currentSelected = get().selectedShapes;

    if (saveHistory && !isEqual(currentSelected, shapes)) {
      get()._saveToHistory(
        { selectedShapes: currentSelected },
        { selectedShapes: shapes }
      );
    }

    set({ selectedShapes: shapes });
  },

  addShape: (shape: CanvasItem) => {
    const currentShapes = get().shapes;
    get()._saveToHistory({ shapes: [] }, { shapes: [shape] });
    set({ shapes: [...currentShapes, shape] });
  },

  modifyShapes: (shapesToModify: CanvasItem[]) => {
    const currentShapes = get().shapes;
    const beforeShapes = shapesToModify
      .map((modifiedShape) => {
        return currentShapes.find((s) => s.id === modifiedShape.id);
      })
      .filter(Boolean) as CanvasItem[];

    get()._saveToHistory(
      { shapes: cloneCanvasItems(beforeShapes) },
      { shapes: cloneCanvasItems(shapesToModify) }
    );

    const updatedShapes = currentShapes.map((shape) => {
      const modifiedShape = shapesToModify.find((m) => m.id === shape.id);
      return modifiedShape || shape;
    });

    set({ shapes: updatedShapes });
  },

  deleteShape: (shapeId: string) => {
    const currentShapes = get().shapes;
    const shapeToDelete = currentShapes.find((s) => s.id === shapeId);

    if (!shapeToDelete) return;

    get()._saveToHistory({ shapes: [shapeToDelete] }, { shapes: [] });

    const shapes = currentShapes.filter((shape) => shape.id !== shapeId);
    const selectedShapes = get().selectedShapes.filter(
      (shape) => shape.id !== shapeId
    );
    set({ shapes, selectedShapes: [...selectedShapes] });
  },

  deleteShapes: (originalShapes?: CanvasItem[]) => {
    const currentShapes = originalShapes || get().shapes;
    const currentSelected = get().selectedShapes;
    if (currentSelected.length === 0) return;

    const findShapeContext = (
      targetId: string,
      shapeList: CanvasItem[],
      parentId: string | null = null
    ): {
      shape: CanvasItem | null;
      parentId: string | null;
      isTopLevel: boolean;
    } => {
      for (const shape of shapeList) {
        if (shape.id === targetId) {
          return {
            shape,
            parentId,
            isTopLevel: parentId === null,
          };
        }

        if (shape.type === "container") {
          const found = findShapeContext(
            targetId,
            (shape as any).children,
            shape.id
          );
          if (found.shape) {
            return found;
          }
        }
      }

      return { shape: null, parentId: null, isTopLevel: false };
    };

    const context = {
      topLevel: [] as Array<{
        id: string;
        type: string;
        parentId: string | null;
      }>,
      nested: [] as Array<{ id: string; type: string; parentId: string }>,
    };

    const shapesToDelete: CanvasItem[] = [];

    currentSelected.forEach((selectedShape) => {
      const shapeContext = findShapeContext(selectedShape.id, currentShapes);
      if (shapeContext.shape) {
        shapesToDelete.push(shapeContext.shape);

        if (shapeContext.isTopLevel) {
          context.topLevel.push({
            id: shapeContext.shape.id,
            type: shapeContext.shape.type,
            parentId: null,
          });
        } else {
          context.nested.push({
            id: shapeContext.shape.id,
            type: shapeContext.shape.type,
            parentId: shapeContext.parentId!,
          });
        }
      }
    });

    const action = get()._saveToHistory(
      {
        shapes: shapesToDelete,
        selectedShapes: currentSelected,
        context,
      },
      {
        shapes: [],
        selectedShapes: [],
        context: { topLevel: [], nested: [] },
      }
    );
    SeatMapCollaboration.broadcastShapeChange(action);

    if (
      (context.nested[0] !== undefined &&
        context.nested[0].parentId !== null) ||
      (context.topLevel[0] !== undefined &&
        context.topLevel[0].parentId !== null)
    ) {
      set({ selectedShapes: [] });
      return;
    }

    const removeSelectedShapesRecursively = (
      shapeList: CanvasItem[]
    ): CanvasItem[] => {
      return shapeList.filter((shape) => {
        if (currentSelected.some((selected) => selected.id === shape.id)) {
          return false;
        }

        if (shape.type === "container" && (shape as any).children) {
          (shape as any).children = removeSelectedShapesRecursively(
            (shape as any).children
          );
        }

        return true;
      });
    };

    const remainingShapes = removeSelectedShapesRecursively([...get().shapes]);
    set({ shapes: remainingShapes, selectedShapes: [] });
  },

  selectAll: () => {
    const allShapes = get().shapes;
    if (allShapes.length === 0) return;
    const selectionTransform = getSelectionTransform();
    selectionTransform?.updateSelection(allShapes);
    set({ selectedShapes: [...allShapes] });
  },

  clearSelection: () => {
    const currentSelected = get().selectedShapes;
    if (currentSelected.length === 0) return;
    const selectionTransform = getSelectionTransform();
    selectionTransform?.updateSelection([]);
    set({ selectedShapes: [] });
  },

  undo: () => {
    const { historyStack, currentHistoryIndex } = get();

    if (currentHistoryIndex < 0) {
      return null;
    }

    const actionToUndo = historyStack[currentHistoryIndex];
    const newIndex = currentHistoryIndex - 1;

    set({ currentHistoryIndex: newIndex });
    if (get().collaboration.isConnected) {
      SeatMapCollaboration.broadcastUndoAction(actionToUndo.id);
    }
    return actionToUndo;
  },

  redo: () => {
    const { historyStack, currentHistoryIndex } = get();

    if (currentHistoryIndex >= historyStack.length - 1) {
      return null;
    }

    const newIndex = currentHistoryIndex + 1;
    const actionToRedo = historyStack[newIndex];

    set({ currentHistoryIndex: newIndex });
    if (get().collaboration.isConnected) {
      SeatMapCollaboration.broadcastRedoAction(actionToRedo.id);
    }
    return actionToRedo;
  },
  syncWithServerPendingChanges: () => {
    if (get().collaboration.isConnected) {
      SeatMapCollaboration.requestPendingChanges();
    }
  },
  canUndo: () => {
    const { currentHistoryIndex } = get();
    return currentHistoryIndex >= 0;
  },

  canRedo: () => {
    const { historyStack, currentHistoryIndex } = get();
    return currentHistoryIndex < historyStack.length - 1;
  },

  clearHistory: () => {
    set({
      historyStack: [],
      currentHistoryIndex: -1,
    });
  },

  setCollaboration: (userId: string, isConnected: boolean) => {
    set({
      collaboration: {
        ...get().collaboration,
        userId,
        isConnected,
      },
    });
  },

  updateRoomUsers: (users: UserInfo[]) => {
    set({
      collaboration: {
        ...get().collaboration,
        roomUsers: users,
      },
    });
  },

  addRoomUser: (user: UserInfo) => {
    const currentRoomUsers = get().collaboration.roomUsers;
    const existingUserIndex = currentRoomUsers.findIndex(
      (u) => u.id === user.id
    );

    if (existingUserIndex >= 0) {
      const updatedUsers = [...currentRoomUsers];
      updatedUsers[existingUserIndex] = user;
      set({
        collaboration: {
          ...get().collaboration,
          roomUsers: updatedUsers,
        },
      });
    } else {
      set({
        collaboration: {
          ...get().collaboration,
          roomUsers: [...currentRoomUsers, user],
        },
      });
    }
  },

  removeRoomUser: (userId: string) => {
    const currentRoomUsers = get().collaboration.roomUsers;
    const filteredUsers = currentRoomUsers.filter((u) => u.id !== userId);

    set({
      collaboration: {
        ...get().collaboration,
        roomUsers: filteredUsers,
      },
    });
  },

  applyRemoteChange: async (change: UndoRedoAction, fromUserId: string) => {
    try {
      if (applyDeltaRestoreRef) {
        await applyDeltaRestoreRef(change, false);
      } else {
        console.warn(
          "⚠️ applyDeltaRestore reference not set, using fallback method"
        );

        const afterShapes = change.data.after.shapes;
        if (afterShapes) {
          get().updateShapes(afterShapes, false, undefined, false);
        }
      }
    } catch (error) {
      console.error("Failed to apply remote change:", error);
    }
  },

  updateImageUploadState: (imageId: string, uploadState, cloudinaryUrl) => {
    const currentShapes = get().shapes;
    const updatedShapes = currentShapes.map((shape) => {
      if (shape.id === imageId && shape.type === "image") {
        const imageShape = shape as ImageShape;
        return {
          ...imageShape,
          uploadState,
          src: cloudinaryUrl || imageShape.src,
          tempBlobUrl:
            uploadState === "uploaded" ? undefined : imageShape.tempBlobUrl,
        };
      }
      return shape;
    });

    get().updateShapes(updatedShapes, true, undefined, true);
  },

  saveDirectHistory: (
    beforeShapes: CanvasItem[],
    afterShapes: CanvasItem[],
    updateStore: boolean = false
  ) => {
    const action: UndoRedoAction = get()._saveToHistory(
      { selectedShapes: afterShapes, shapes: beforeShapes },
      { selectedShapes: afterShapes, shapes: afterShapes }
    );

    SeatMapCollaboration.broadcastShapeChange(action);
    if (updateStore) {
      set({ shapes: [...afterShapes] });
    }
  },

  _saveToHistory: (
    beforeState: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
      context?: ShapeContext;
    }>,
    afterState?: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
      context?: ShapeContext;
    }>,
    existingAction?: UndoRedoAction
  ): UndoRedoAction => {
    const {
      shapes: currentShapes,
      selectedShapes: currentSelected,
      historyStack,
      currentHistoryIndex,
      seatMap,
    } = get();

    const finalAfterState = afterState || {
      shapes: currentShapes,
      selectedShapes: currentSelected,
    };

    const newAction: UndoRedoAction = existingAction || {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        before: {
          shapes: beforeState.shapes
            ? cloneCanvasItems(beforeState.shapes)
            : undefined,
          selectedShapes: beforeState.selectedShapes
            ? cloneCanvasItems(beforeState.selectedShapes)
            : undefined,
          affectedIds: beforeState.shapes?.map((s) => s.id) || [],
          context: beforeState.context,
        },
        after: {
          shapes: finalAfterState.shapes
            ? cloneCanvasItems(finalAfterState.shapes)
            : undefined,
          selectedShapes: finalAfterState.selectedShapes
            ? cloneCanvasItems(finalAfterState.selectedShapes)
            : undefined,
          affectedIds: finalAfterState.shapes?.map((s) => s.id) || [],
          context: finalAfterState.context,
        },
      },
    };

    const newStack = historyStack.slice(0, currentHistoryIndex + 1);
    newStack.push(newAction);
    console.log("History stack:", newStack);

    set({
      historyStack: newStack,
      currentHistoryIndex: newStack.length - 1,
    });

    if (seatMap?.id) {
      saveHistoryToStorage(seatMap.id, newStack, newStack.length - 1);
    }

    return newAction;
  },

  setHistory: (historyStack: UndoRedoAction[], currentHistoryIndex: number) => {
    set({ historyStack, currentHistoryIndex });
  },

  restoreHistoryFromStorage: (seatMapId: string): boolean => {
    try {
      const storedData = loadHistoryFromStorage(seatMapId);

      if (storedData) {
        set({
          historyStack: storedData.historyStack,
          currentHistoryIndex: storedData.currentIndex,
        });

        console.log(
          `✅ Restored ${storedData.historyStack.length} actions from localStorage`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to restore history from storage:", error);
      return false;
    }
  },

  clearStoredHistory: () => {
    set({ historyStack: [], currentHistoryIndex: -1 });

    clearHistoryFromStorage(get().seatMap?.id || "");
  },

  _findAffectedShapes: (oldShapes: CanvasItem[], newShapes: CanvasItem[]) => {
    const before: CanvasItem[] = [];
    const after: CanvasItem[] = [];
    const affectedIds: string[] = [];

    oldShapes.forEach((oldShape) => {
      const newShape = newShapes.find((s) => s.id === oldShape.id);
      if (!newShape) {
        before.push(oldShape);
        affectedIds.push(oldShape.id);
      } else if (
        !isEqual(cloneCanvasItem(oldShape), cloneCanvasItem(newShape))
      ) {
        before.push(oldShape);
        after.push(newShape);
        affectedIds.push(oldShape.id);
      }
    });

    newShapes.forEach((newShape) => {
      const oldShape = oldShapes.find((s) => s.id === newShape.id);
      if (!oldShape) {
        after.push(newShape);
        affectedIds.push(newShape.id);
      }
    });

    return {
      before: cloneCanvasItems(before),
      after: cloneCanvasItems(after),
      affectedIds: affectedIds,
    };
  },

  customerInitializeEventData: (eventData) => {
    set((state) => ({
      customer: {
        ...state.customer,
        customerEventData: eventData,
        customerSeatStatusMap: {
          ...eventData.seatStatusData.paidSeatIds.reduce(
            (acc, id) => ({ ...acc, [id]: "sold" as const }),
            {}
          ),
          ...eventData.seatStatusData.activeHoldSeatIds.reduce(
            (acc, id) => ({ ...acc, [id]: "held" as const }),
            {}
          ),
        },
      },
    }));
  },

  customerToggleSeatSelection: (seatId: string) => {
    const { customer } = get();
    const isSelected = customer.customerSelectedSeatIds.includes(seatId);
    if (isSelected) {
      return get().customerDeselectSeat(seatId);
    } else {
      const status = get().customerGetSeatStatus(seatId);

      if (status !== "available") {
        return false;
      }

      const canSelect = get().customerCanSelectMoreSeats();
      if (canSelect) {
        return get().customerSelectSeat(seatId);
      }
      return false;
    }
  },

  customerSelectSeat: (seatId: string) => {
    const { customer } = get();

    if (customer.customerSelectedSeatIds.includes(seatId)) {
      return false;
    }

    const status = get().customerGetSeatStatus(seatId);
    if (status !== "available") {
      return false;
    }

    if (!get().customerCanSelectMoreSeats()) {
      return false;
    }

    const seatInfo = get().customerFindSeatInfoById(seatId);
    if (!seatInfo) {
      return false;
    }

    set((state) => {
      const newSelectedIds = [
        ...state.customer.customerSelectedSeatIds,
        seatId,
      ];
      const newSeatInfo = { ...seatInfo, status: "selected" as const };
      const newSelectedSeatsInfo = [
        ...state.customer.customerSelectedSeatsInfo,
        newSeatInfo,
      ];

      return {
        customer: {
          ...state.customer,
          customerSelectedSeatIds: newSelectedIds,
          customerSelectedSeatsInfo: newSelectedSeatsInfo,
          customerSeatStatusMap: {
            ...state.customer.customerSeatStatusMap,
            [seatId]: "selected",
          },
          customerLastSelectionTime: Date.now(),
          customerOrderSummary: get().customerGetOrderSummary(),
        },
      };
    });

    return true;
  },

  customerDeselectSeat: (seatId: string) => {
    const { customer } = get();

    if (!customer.customerSelectedSeatIds.includes(seatId)) {
      return false;
    }

    set((state) => {
      const newSelectedIds = state.customer.customerSelectedSeatIds.filter(
        (id) => id !== seatId
      );
      const newSelectedSeatsInfo =
        state.customer.customerSelectedSeatsInfo.filter(
          (seat) => seat.seatId !== seatId
        );

      return {
        customer: {
          ...state.customer,
          customerSelectedSeatIds: newSelectedIds,
          customerSelectedSeatsInfo: newSelectedSeatsInfo,
          customerSeatStatusMap: {
            ...state.customer.customerSeatStatusMap,
            [seatId]: "available",
          },
          customerLastSelectionTime: Date.now(),
          customerOrderSummary: get().customerGetOrderSummary(),
        },
      };
    });

    return true;
  },

  customerClearAllSelections: () => {
    const { customer } = get();
    const clearedStatusMap = { ...customer.customerSeatStatusMap };

    customer.customerSelectedSeatIds.forEach((seatId) => {
      if (clearedStatusMap[seatId] === "selected") {
        clearedStatusMap[seatId] = "available";
      }
    });

    set((state) => ({
      customer: {
        ...state.customer,
        customerSelectedSeatIds: [],
        customerSelectedSeatsInfo: [],
        customerSeatStatusMap: clearedStatusMap,
        customerLastSelectionTime: Date.now(),
        customerOrderSummary: {
          selectedSeats: [],
          totalSeats: 0,
          subtotal: 0,
          serviceFee: 0,
          total: 0,
        },
      },
    }));
  },

  customerSetHoveredSeat: (seatId: string | null) => {
    set((state) => ({
      customer: {
        ...state.customer,
        customerHoveredSeatId: seatId,
      },
    }));
  },

  customerGetSeatStatus: (seatId: string) => {
    const { customer } = get();

    if (customer.customerSelectedSeatIds.includes(seatId)) {
      return "selected" as const;
    }

    const externalStatus = customer.customerSeatStatusMap[seatId];

    if (externalStatus && externalStatus !== "selected") {
      return externalStatus;
    }

    return "available";
  },

  customerUpdateSeatStatusMap: (statusMap) => {
    set((state) => ({
      customer: {
        ...state.customer,
        customerSeatStatusMap: {
          ...state.customer.customerSeatStatusMap,
          ...statusMap,
        },
      },
    }));
  },

  customerSetSelectionLimits: (min: number, max: number) => {
    set((state) => ({
      customer: {
        ...state.customer,
        customerMinSeatsRequired: min,
        customerMaxSeatsAllowed: max,
      },
    }));
  },

  customerCanSelectMoreSeats: () => {
    const { customer } = get();
    return (
      customer.customerSelectedSeatIds.length < customer.customerMaxSeatsAllowed
    );
  },

  customerGetOrderSummary: () => {
    const { customer } = get();
    const selectedSeats = customer.customerSelectedSeatsInfo;
    const subtotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const serviceFee = 0;

    return {
      selectedSeats,
      totalSeats: selectedSeats.length,
      subtotal,
      serviceFee,
      total: subtotal + serviceFee,
    };
  },

  customerFindSeatInfoById: (seatId: string) => {
    const { customer } = get();
    const { seatingStructure } = customer.customerEventData;
    if (!seatingStructure) return null;

    for (const area of seatingStructure) {
      for (const row of area.rows) {
        for (const seat of row.seats) {
          if (seat.id === seatId) {
            return {
              seatId: seat.id,
              areaName: area.name,
              rowName: row.rowName,
              seatNumber: seat.seatNumber,
              price: area.price,
              status: get().customerGetSeatStatus(seat.id),
            } as CustomerSeatInfo;
          }
        }
      }
    }

    return null;
  },

  customerGetSelectedSeatsGroupedByArea: () => {
    const { customer } = get();
    const grouped: Record<string, CustomerSeatInfo[]> = {};

    customer.customerSelectedSeatsInfo.forEach((seat) => {
      if (!grouped[seat.areaName]) {
        grouped[seat.areaName] = [];
      }
      grouped[seat.areaName].push(seat);
    });

    Object.keys(grouped).forEach((areaName) => {
      grouped[areaName].sort((a, b) => {
        if (a.rowName !== b.rowName) {
          return a.rowName.localeCompare(b.rowName);
        }
        return a.seatNumber.localeCompare(b.seatNumber, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
    });

    return grouped;
  },

  customerCalculateTotalPrice: () => {
    const { customer } = get();
    return customer.customerSelectedSeatsInfo.reduce(
      (total, seat) => total + seat.price,
      0
    );
  },

  customerValidateSelection: () => {
    const { customer } = get();
    const errors: string[] = [];
    const selectedCount = customer.customerSelectedSeatIds.length;

    if (selectedCount < customer.customerMinSeatsRequired) {
      errors.push(
        `Please select at least ${customer.customerMinSeatsRequired} seat(s)`
      );
    }

    if (selectedCount > customer.customerMaxSeatsAllowed) {
      errors.push(
        `Cannot select more than ${customer.customerMaxSeatsAllowed} seats`
      );
    }

    const unavailableSeats = customer.customerSelectedSeatsInfo.filter(
      (seat) => {
        const currentStatus = get().customerGetSeatStatus(seat.seatId);
        return currentStatus !== "selected" && currentStatus !== "available";
      }
    );

    if (unavailableSeats.length > 0) {
      errors.push(
        `Some selected seats are no longer available: ${unavailableSeats.map((s) => `${s.areaName} ${s.rowName}-${s.seatNumber}`).join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  customerResetState: () => {
    set((state) => ({
      customer: {
        customerSelectedSeatIds: [],
        customerSelectedSeatsInfo: [],
        customerOrderSummary: {
          selectedSeats: [],
          totalSeats: 0,
          subtotal: 0,
          serviceFee: 0,
          total: 0,
        },
        customerIsSelecting: false,
        customerMaxSeatsAllowed: 10,
        customerMinSeatsRequired: 1,
        customerHoveredSeatId: null,
        customerSeatStatusMap: {},
        customerLastSelectionTime: null,
        customerEventData: {},
      },
    }));
  },
}));
