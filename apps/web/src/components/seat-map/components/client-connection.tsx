import React, { useEffect, useState, useRef } from "react";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import { useSeatMapStore } from "../store/seat-map-store";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

function ClientConnection() {
  const [isClient, setIsClient] = useState(false);
  const [showInitializingModal, setShowInitializingModal] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const seatMapId = searchParams.get("seatMapId");

  const isLoading = useSeatMapStore((state) => state.isLoading);
  const { data: session } = authClient.useSession();
  const initializationRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Prevent running on server and ensure required params/session exist
    if (!isClient || !seatMapId || initializationRef.current || !session) {
      return;
    }

    initializationRef.current = true;
    setShowInitializingModal(true);
    setConnectionError(null);

    (async () => {
      try {
        console.log("🚀 Starting collaboration initialization...");

        // Set loading state
        useSeatMapStore.setState({ isLoading: true });

        // Initialize and wait for connection + boot to complete
        await SeatMapCollaboration.initialize(seatMapId, session.user.id);

        console.log(
          "✅ Collaboration initialized and seat map booted successfully"
        );
        setShowInitializingModal(false);
      } catch (err) {
        console.error("Error during collaboration initialization:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect to server";
        setConnectionError(errorMessage);

        // Reset initialization flag to allow retry
        initializationRef.current = false;

        // Set loading to false
        useSeatMapStore.setState({ isLoading: false });

        // Keep modal open to show error
        setTimeout(() => {
          setShowInitializingModal(false);
          setConnectionError(null);
        }, 5000);
      }
    })();

    return () => {
      // Cleanup on unmount
      SeatMapCollaboration.disconnect();
      initializationRef.current = false;
      setShowInitializingModal(false);
      setConnectionError(null);
    };
  }, [isClient, seatMapId, session]);

  // Hide modal when loading completes successfully
  useEffect(() => {
    if (!isLoading && showInitializingModal && !connectionError) {
      const hideTimeout = setTimeout(() => {
        setShowInitializingModal(false);
      }, 500);
      return () => clearTimeout(hideTimeout);
    }
  }, [isLoading, showInitializingModal, connectionError]);

  if (!isClient) return null;

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {seatMapId && (
            <div className="text-sm text-gray-500">
              Seat Map ID: <span className="font-mono">{seatMapId}</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            User: <span className="font-mono">{session?.user.id}</span>
          </div>
        </div>
      </div>

      {showInitializingModal && seatMapId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
            onClick={(e) => e.preventDefault()}
          />

          <div className="relative bg-white rounded-lg shadow-2xl border max-w-md w-full mx-4 p-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              {connectionError ? (
                <>
                  <div className="mx-auto mb-6 w-16 h-16 flex items-center justify-center">
                    <div className="text-red-600 text-5xl">⚠️</div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Connection Failed
                  </h3>

                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {connectionError}
                  </p>

                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry Connection
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-6 w-16 h-16 relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-blue-600"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Initializing Canvas Seat Map
                  </h3>

                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Connecting to server and loading seat map data...
                  </p>

                  <div className="mt-6 text-xs text-gray-400">
                    Please wait while we establish a secure connection.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(ClientConnection);
