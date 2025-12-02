import { io, Socket } from "socket.io-client";
import { UndoRedoAction } from "../store/seat-map-store";
import { useSeatMapStore } from "../store/seat-map-store";
import { ImageShape, CanvasItem } from "../types";
import { setShapes, shapes, shapeContainer } from "../variables";

let recreateShapeRef:
  | ((
      shapeData: CanvasItem,
      addShapeEvents?: boolean,
      useRelativePositioning?: boolean
    ) => Promise<CanvasItem>)
  | null = null;

export const setRecreateShapeReference = (
  fn: (
    shapeData: CanvasItem,
    addShapeEvents?: boolean,
    useRelativePositioning?: boolean
  ) => Promise<CanvasItem>
) => {
  recreateShapeRef = fn;
};

export class SeatMapCollaboration {
  private socket: Socket | null = null;
  private userId: string = "";
  private seatMapId: string = "";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  private static instance: SeatMapCollaboration | null = null;

  private constructor() {}

  public static getInstance(): SeatMapCollaboration {
    if (!SeatMapCollaboration.instance) {
      SeatMapCollaboration.instance = new SeatMapCollaboration();
    }
    return SeatMapCollaboration.instance;
  }

  /**
   * Initialize and connect to the socket server, then boot the seat map
   * @returns Promise that resolves when connection is established and seat map is booted
   */
  public static async initialize(
    seatMapId: string,
    userId: string
  ): Promise<void> {
    const instance = SeatMapCollaboration.getInstance();

    if (instance.isConnecting && instance.connectionPromise) {
      return instance.connectionPromise;
    }

    instance.seatMapId = seatMapId;
    instance.userId = userId;
    instance.isConnecting = true;
    useSeatMapStore.setState({
      collaboration: {
        isConnected: false,
        roomUsers: [],
        userId: userId,
      },
    });

    instance.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        await instance.connect();

        await instance.waitForConnection(10000);

        await instance.bootSeatMapInternal(seatMapId, userId);

        instance.isConnecting = false;
        resolve();
      } catch (error) {
        console.error("Failed to initialize collaboration:", error);
        instance.isConnecting = false;
        instance.connectionPromise = null;
        reject(error);
      }
    });

    return instance.connectionPromise;
  }

  /**
   * Wait for socket connection to be established
   */
  private async waitForConnection(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.socket?.connected) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error("Connection timeout"));
          return;
        }

        setTimeout(checkConnection, 100);
      };

      checkConnection();
    });
  }

  /**
   * Internal method to boot seat map (called after connection is established)
   */
  private async bootSeatMapInternal(
    seatMapId: string,
    userId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const successHandler = async (data: any) => {
        await this.handleSeatMapBootSuccess(data);
        cleanup();
        resolve();
      };

      const errorHandler = (data: any) => {
        console.error("Seat map boot error:", data);
        cleanup();
        reject(new Error(data.message || "Failed to boot seat map"));
      };

      const cleanup = () => {
        this.socket?.off("seat_map_boot_success", successHandler);
        this.socket?.off("seat_map_boot_error", errorHandler);
      };

      this.socket.once("seat_map_boot_success", successHandler);
      this.socket.once("seat_map_boot_error", errorHandler);

      this.socket.emit("boot_seat_map", { seatMapId, userId });

      setTimeout(() => {
        cleanup();
        reject(new Error("Boot seat map timeout"));
      }, 15000);
    });
  }

  public static disconnect(): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.disconnect();
  }

  public static isConnected(): boolean {
    const instance = SeatMapCollaboration.getInstance();
    return instance.isConnected();
  }

  public static broadcastShapeChange(change: UndoRedoAction): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastShapeChange(change);
  }

  public static broadcastImageUploadStart(imageShape: ImageShape): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastImageUploadStart(imageShape);
  }

  public static broadcastImageUploadComplete(
    imageId: string,
    cloudinaryUrl: string
  ): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastImageUploadComplete(imageId, cloudinaryUrl);
  }

  public static broadcastImageUploadFailed(imageId: string): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastImageUploadFailed(imageId);
  }

  public static broadcastUndoAction(actionId: string): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastUndoRedo(actionId, "undo");
  }

  public static broadcastRedoAction(actionId: string): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.broadcastUndoRedo(actionId, "redo");
  }

  public static requestPendingChanges(): void {
    const instance = SeatMapCollaboration.getInstance();
    instance.requestPendingChanges();
  }

  public static resetInstance(): void {
    if (SeatMapCollaboration.instance) {
      SeatMapCollaboration.instance.disconnect();
      SeatMapCollaboration.instance = null;
    }
  }

  private serializeShape(shape: CanvasItem): any {
    const serialized: any = {};

    for (const [key, value] of Object.entries(shape)) {
      if (
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
        serialized[key] = value.map((child) => this.serializeShape(child));
      } else if (Array.isArray(value)) {
        serialized[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? JSON.parse(JSON.stringify(item))
            : item
        );
      } else if (typeof value === "object" && value !== null) {
        if (value.constructor === Object) {
          serialized[key] = JSON.parse(JSON.stringify(value));
        } else {
          continue;
        }
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  }

  private serializeUndoRedoAction(action: UndoRedoAction): any {
    try {
      const serialized = {
        id: action.id,
        timestamp: action.timestamp,
        data: {
          before: {
            shapes: action.data.before.shapes?.map((shape) =>
              this.serializeShape(shape)
            ),
            selectedShapes: action.data.before.selectedShapes?.map((shape) =>
              this.serializeShape(shape)
            ),
            affectedIds: action.data.before.affectedIds,
            context: action.data.before.context,
          },
          after: {
            shapes: action.data.after.shapes?.map((shape) =>
              this.serializeShape(shape)
            ),
            selectedShapes: action.data.after.selectedShapes?.map((shape) =>
              this.serializeShape(shape)
            ),
            affectedIds: action.data.after.affectedIds,
            context: action.data.after.context,
          },
        },
      };

      return serialized;
    } catch (error) {
      console.error("Failed to serialize UndoRedoAction:", error);
      return null;
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const socketUrl =
          process.env.NEXT_PUBLIC_SEATMAP_SOCKET_URL || "http://localhost:8080";

        this.socket = io(socketUrl, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 20000,
        });

        this.setupEventListeners();

        this.socket.once("connect", () => {
          this.reconnectAttempts = 0;
          useSeatMapStore.setState((state) => ({
            collaboration: {
              ...state.collaboration,
              isConnected: true,
            },
          }));
          resolve();
        });

        this.socket.once("connect_error", (error) => {
          console.error("Socket connection error:", error);
          reject(error);
        });
      } catch (error) {
        console.error("Failed to create socket:", error);
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
      useSeatMapStore.setState((state) => ({
        collaboration: {
          ...state.collaboration,
          isConnected: true,
        },
      }));
    });

    this.socket.on("disconnect", (reason) => {
      useSeatMapStore.setState((state) => ({
        collaboration: {
          ...state.collaboration,
          isConnected: false,
        },
      }));
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("Max reconnection attempts reached");
      }
    });

    this.socket.on("shape_change", (data) => this.handleShapeChange(data));
    this.socket.on("image_upload_start", (data) =>
      this.handleImageUploadStart(data)
    );
    this.socket.on("image_upload_complete", (data) =>
      this.handleImageUploadComplete(data)
    );
    this.socket.on("image_upload_failed", (data) =>
      this.handleImageUploadFailed(data)
    );
    this.socket.on("user_joined", (data) => {});
    this.socket.on("user_left", (data) => {});
    this.socket.on("undo_redo_action", (data) => {
      this.handleRemoteUndoRedo(data);
    });

    // ✅ NEW: Handle pending changes response
    this.socket.on("pending_changes_response", (data) => {
      this.handlePendingChangesResponse(data);
    });
  }

  private async handleSeatMapBootSuccess(data: {
    seatMap: any;
    userInfo: any;
    roomUsers: any[];
    pendingChanges?: Array<{
      change: UndoRedoAction;
      fromUserId: string;
      timestamp: number;
    }>;
    message: string;
  }) {
    useSeatMapStore.setState({
      seatMap: {
        id: data.seatMap.id,
        name: data.seatMap.name,
        image: data.seatMap.image,
        createdBy: data.seatMap.createdBy,
        publicity: data.seatMap.publicity,
        createdAt: data.seatMap.createdAt,
        updatedAt: data.seatMap.updatedAt,
      },
      collaboration: {
        isConnected: true,
        roomUsers: data.roomUsers,
        userId: this.userId,
      },
      isLoading: false,
    });

    if (data.seatMap.shapes && Array.isArray(data.seatMap.shapes)) {
      if (!recreateShapeRef) {
        console.error("recreateShape function not initialized");
        return;
      }

      try {
        const recreatedShapes: CanvasItem[] = [];

        for (const shapeData of data.seatMap.shapes) {
          try {
            const recreatedShape = await recreateShapeRef(
              shapeData,
              true,
              false
            );

            if (shapeContainer) {
              shapeContainer.addChild(recreatedShape.graphics);
            }

            recreatedShapes.push(recreatedShape);
          } catch (error) {
            console.error("Failed to recreate shape:", shapeData.id, error);
          }
        }

        const hasAreaModeContainer = recreatedShapes.find(
          (shape: any) => shape.id === "area-mode-container-id"
        );

        if (!hasAreaModeContainer) {
          setShapes([...shapes, ...recreatedShapes]);
        } else {
          setShapes(recreatedShapes);
        }

        useSeatMapStore
          .getState()
          .updateShapes([...shapes], false, undefined, false);
      } catch (error) {
        console.error("Failed to recreate shapes:", error);
      }
    }
    if (data.pendingChanges && data.pendingChanges.length > 0) {
      const sortedChanges = data.pendingChanges.sort(
        (a, b) => a.timestamp - b.timestamp
      );

      for (const { change, fromUserId } of sortedChanges) {
        await useSeatMapStore.getState().applyRemoteChange(change, fromUserId);
      }
    }
  }

  private handleShapeChange(data: {
    change: UndoRedoAction;
    fromUserId: string;
  }) {
    if (data.fromUserId === this.userId) return;
    useSeatMapStore.getState().applyRemoteChange(data.change, data.fromUserId);
  }

  private handleImageUploadStart(data: {
    imageShape: ImageShape;
    fromUserId: string;
  }) {
    if (data.fromUserId === this.userId) return;
  }

  private handleImageUploadComplete(data: {
    imageId: string;
    cloudinaryUrl: string;
    fromUserId: string;
  }) {
    if (data.fromUserId === this.userId) return;

    useSeatMapStore
      .getState()
      .updateImageUploadState(data.imageId, "uploaded", data.cloudinaryUrl);
  }

  private handleImageUploadFailed(data: {
    imageId: string;
    fromUserId: string;
  }) {
    if (data.fromUserId === this.userId) return;

    useSeatMapStore.getState().updateImageUploadState(data.imageId, "failed");
  }

  // ✅ Updated: Handle remote undo/redo with full action data
  private handleRemoteUndoRedo(data: {
    action: UndoRedoAction;
    operation: "undo" | "redo";
    fromUserId: string;
    timestamp: number;
  }) {
    if (data.fromUserId === this.userId) return;

    // ✅ Apply the remote undo/redo action directly
    this.applyRemoteUndoRedoAction(data.action, data.operation);

    // ✅ Show notification
    this.showRemoteUndoRedoNotification(data);
  }

  // ✅ NEW: Apply remote undo/redo action
  private async applyRemoteUndoRedoAction(
    action: UndoRedoAction,
    operation: "undo" | "redo"
  ) {
    try {
      // ✅ Import the undo-redo utility function
      const { applyDeltaRestore } = await import("../utils/undo-redo");

      // ✅ Apply the action as if it were a remote change
      await applyDeltaRestore(
        action,
        operation === "undo", // isUndo
        false, // updateHistory - don't save to local history
        false // broadcastToOthers - don't broadcast back
      );
    } catch (error) {
      console.error(`Failed to apply remote ${operation} action:`, error);
    }
  }

  // ✅ Updated: Broadcast undo/redo action with full action data
  private broadcastUndoRedo(actionId: string, operation: "undo" | "redo") {
    if (!this.socket?.connected) {
      console.warn(`⚠️ Socket not connected, cannot broadcast ${operation}`);
      return;
    }

    // ✅ Find the action in local history
    const store = useSeatMapStore.getState();
    const action = store.historyStack.find((a) => a.id === actionId);

    if (!action) {
      console.warn(
        `⚠️ Action ${actionId} not found in local history, cannot broadcast ${operation}`
      );
      return;
    }

    try {
      // ✅ Serialize the full action
      const serializedAction = this.serializeUndoRedoAction(action);
      if (!serializedAction) {
        console.error(`Failed to serialize action ${actionId}`);
        return;
      }

      this.socket.emit("undo_redo_action", {
        seatMapId: this.seatMapId,
        action: serializedAction,
        operation,
        fromUserId: this.userId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to broadcast ${operation} action:`, error);
    }
  }

  // ✅ NEW: Handle pending changes response
  private handlePendingChangesResponse(data: {
    seatMapId: string;
    pendingChanges: Array<{
      change: UndoRedoAction;
      fromUserId: string;
      timestamp: number;
    }>;
    timestamp: number;
  }) {
    // ✅ Apply pending changes that are newer than our last known state
    this.applyPendingChanges(data.pendingChanges);
  }

  // ✅ NEW: Request pending changes from server
  private requestPendingChanges() {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot request pending changes");
      return;
    }

    try {
      this.socket.emit("request_pending_changes", {
        seatMapId: this.seatMapId,
        fromUserId: this.userId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to request pending changes:", error);
    }
  }

  // ✅ NEW: Show notification for remote undo/redo
  private showRemoteUndoRedoNotification(data: {
    action: UndoRedoAction;
    operation: "undo" | "redo";
    fromUserId: string;
    timestamp: number;
  }) {
    // ✅ Find user name from room users
    const collaboration = useSeatMapStore.getState().collaboration;
    const user = collaboration.roomUsers.find((u) => u.id === data.fromUserId);
    const userName = user?.name || `User ${data.fromUserId}`;

    // ✅ You can add toast notification here if desired
    // Example: showToast(`${userName} performed ${data.operation}`, 'info');
  }

  private async applyPendingChanges(
    pendingChanges: Array<{
      change: UndoRedoAction;
      fromUserId: string;
      timestamp: number;
    }>
  ) {
    // ✅ Sort by timestamp to ensure proper order
    const sortedChanges = pendingChanges.sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // ✅ Get current timestamp to filter out changes we might have already applied
    const store = useSeatMapStore.getState();
    const lastKnownTimestamp =
      store.historyStack.length > 0
        ? Math.max(...store.historyStack.map((action) => action.timestamp))
        : 0;

    // ✅ Apply only changes that are newer than our last known timestamp
    const newChanges = sortedChanges.filter(
      ({ change, fromUserId }) =>
        change.timestamp > lastKnownTimestamp && fromUserId !== this.userId
    );

    for (const { change, fromUserId } of newChanges) {
      try {
        await store.applyRemoteChange(change, fromUserId);
      } catch (error) {
        console.error(`Failed to apply pending change ${change.id}:`, error);
      }
    }
  }

  private broadcastShapeChange(change: UndoRedoAction) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot broadcast change");
      return;
    }

    const serializedChange = this.serializeUndoRedoAction(change);
    if (!serializedChange) {
      console.error("Failed to serialize change, skipping broadcast");
      return;
    }

    try {
      this.socket.emit("shape_change", {
        change: serializedChange,
        fromUserId: this.userId,
        seatMapId: this.seatMapId,
      });
    } catch (error) {
      console.error("Failed to broadcast shape change:", error);
    }
  }

  private broadcastImageUploadStart(imageShape: ImageShape) {
    if (!this.socket?.connected) return;

    const serializedShape = this.serializeShape(imageShape);

    try {
      this.socket.emit("image_upload_start", {
        imageShape: serializedShape,
        fromUserId: this.userId,
        seatMapId: this.seatMapId,
      });
    } catch (error) {
      console.error("Failed to broadcast image upload start:", error);
    }
  }

  private broadcastImageUploadComplete(imageId: string, cloudinaryUrl: string) {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit("image_upload_complete", {
        imageId,
        cloudinaryUrl,
        fromUserId: this.userId,
        seatMapId: this.seatMapId,
      });
    } catch (error) {
      console.error("Failed to broadcast image upload complete:", error);
    }
  }

  private broadcastImageUploadFailed(imageId: string) {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit("image_upload_failed", {
        imageId,
        fromUserId: this.userId,
        seatMapId: this.seatMapId,
      });
    } catch (error) {
      console.error("Failed to broadcast image upload failed:", error);
    }
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    this.connectionPromise = null;

    useSeatMapStore.setState({
      collaboration: {
        isConnected: false,
        roomUsers: [],
        userId: "",
      },
    });
  }

  private isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
