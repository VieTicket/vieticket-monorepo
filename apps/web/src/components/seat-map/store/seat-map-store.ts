import { create } from "zustand";
import { CanvasItem, ImageShape } from "../types";
import { isEqual } from "lodash";
import { getSelectionTransform } from "../events/transform-events";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";

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

let applyDeltaRestoreRef:
  | ((action: UndoRedoAction, isUndo: boolean) => Promise<void>)
  | null = null;

export const setApplyDeltaRestoreReference = (
  fn: (action: UndoRedoAction, isUndo: boolean) => Promise<void>
) => {
  applyDeltaRestoreRef = fn;
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
      (typeof value === "object" &&
        value !== null &&
        (value.constructor?.name?.includes("PIXI") ||
          value.constructor?.name?.includes("Graphics") ||
          value.constructor?.name?.includes("Container") ||
          value.constructor?.name?.includes("Sprite")))
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
  maxHistorySize: number;

  collaboration: CollaborationState;

  setSeatMap: (seatMap: SeatMapInfo | null) => void;
  setLoading: (loading: boolean) => void;

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
}

export const useSeatMapStore = create<SeatMapStore>((set, get) => ({
  seatMap: null,
  isLoading: false,
  shapes: [],
  selectedShapes: [],
  historyStack: [],
  currentHistoryIndex: -1,
  maxHistorySize: 50,
  collaboration: {
    userId: "",
    userInfo: null,
    isConnected: false,
    roomUsers: [],
  },

  setSeatMap: (seatMap: SeatMapInfo | null) => {
    const currentSeatMap = get().seatMap;

    if (!currentSeatMap && !seatMap) return;

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
      console.error("❌ Failed to apply remote change:", error);
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
      maxHistorySize,
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

    if (newStack.length > maxHistorySize) {
      newStack.shift();
      set({
        historyStack: newStack,
        currentHistoryIndex: newStack.length - 1,
      });
    } else {
      set({
        historyStack: newStack,
        currentHistoryIndex: newStack.length - 1,
      });
    }
    return newAction;
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
}));
