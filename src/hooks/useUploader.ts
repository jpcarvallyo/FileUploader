import { useAtom, useSetAtom } from "jotai";
import { useCallback, useRef } from "react";
import { createActor } from "xstate";
import { uploadMachine } from "../machines/uploadMachine";
import { getUploadUrl, uploadFile, notifyCompletion } from "../api/mocks";
import {
  uploadActorsAtom,
  uploadSummaryAtom,
  addUploadActorAtom,
  removeUploadActorAtom,
  clearUploadActorsAtom,
  hasActiveUploadsAtom,
} from "../state/uploads.atoms";

export interface UploadSummary {
  total: number;
  uploading: number;
  success: number;
  failure: number;
  cancelled: number;
}

export const useUploader = () => {
  const [uploadActors] = useAtom(uploadActorsAtom);
  const [summary] = useAtom(uploadSummaryAtom);
  const [hasActiveUploads] = useAtom(hasActiveUploadsAtom);
  const addUploadActor = useSetAtom(addUploadActorAtom);
  const removeUploadActor = useSetAtom(removeUploadActorAtom);
  const clearUploadActors = useSetAtom(clearUploadActorsAtom);

  // Store cancellation functions for each upload
  const cancellationFunctions = useRef(new Map<string, () => void>());

  // Add files and create actors for each
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      fileArray.forEach(async (file) => {
        const id = `upload_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Create actor with file in context
        const actor = createActor(uploadMachine, {
          input: { file },
          context: {
            file,
            uploadId: null,
            uploadUrl: null,
            progress: null,
            result: null,
            error: null,
          },
        });

        // Add actor to store
        addUploadActor(id, actor);
        console.log(`Actor created with ID: ${id}`);

        // Start the upload process
        actor.start();
        console.log(`Actor started for ID: ${id}`);

        // Send START event
        actor.send({ type: "START" });
        console.log(`START event sent for ID: ${id}`);

        // Check initial state
        const initialState = actor.getSnapshot();
        console.log(`Initial state for ${id}:`, initialState.value);

        // Handle the upload process
        console.log(`Starting upload for file: ${file.name}`);

        // Create a cancellation token for this upload
        let isCancelled = false;

        // Store the cancellation function in the actor's context
        const cancelUpload = () => {
          isCancelled = true;
          console.log(`Upload ${id} cancelled`);
        };

        // Simple test - just simulate a basic upload
        setTimeout(async () => {
          try {
            console.log("=== UPLOAD PROCESS STARTING ===");

            // Step 1: Get upload URL
            console.log("Getting upload URL...");
            actor.send({ type: "GETTING_URL" });
            const uploadUrlResponse = await getUploadUrl(file.name, file.size);

            if (isCancelled) {
              console.log(`Upload ${id} cancelled after getting URL`);
              return;
            }

            console.log("Upload URL received:", uploadUrlResponse);

            // Update context with upload URL
            actor.send({
              type: "URL_RECEIVED",
              uploadId: uploadUrlResponse.id,
              uploadUrl: uploadUrlResponse.uploadUrl,
            });
            console.log("URL_RECEIVED event sent");

            // Step 2: Upload file
            console.log("Starting file upload...");
            actor.send({ type: "UPLOADING" });
            const uploadResult = await uploadFile(
              uploadUrlResponse.uploadUrl,
              file,
              (progress) => {
                if (isCancelled) return;
                console.log("Progress:", progress);
                // Send progress updates
                const currentState = actor.getSnapshot();
                console.log(`Sending PROGRESS event to actor ${id}:`, progress);
                console.log(`Current actor state:`, currentState.value);
                console.log(`Event object being sent:`, {
                  type: "PROGRESS",
                  value: progress,
                });
                // Send with value property
                actor.send({ type: "PROGRESS", value: progress });
              }
            );

            if (isCancelled) {
              console.log(`Upload ${id} cancelled after file upload`);
              return;
            }

            console.log("Upload completed:", uploadResult);

            // Step 3: Notify completion (simplified - go directly to success)
            console.log("Notifying completion...");
            await notifyCompletion(uploadResult.id, file.name);

            if (isCancelled) {
              console.log(`Upload ${id} cancelled after notification`);
              return;
            }

            // Step 4: Success
            console.log("Upload successful!");
            actor.send({ type: "SUCCESS", result: uploadResult });
          } catch (error) {
            if (isCancelled) {
              console.log(`Upload ${id} cancelled during error handling`);
              return;
            }
            console.error("Upload error:", error);
            // Handle error
            actor.send({
              type: "ERROR",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }, 100); // Small delay to ensure actor is ready

        // Store the cancellation function in our ref
        cancellationFunctions.current.set(id, cancelUpload);

        // Store the cancellation function in the actor's context
        actor.send({
          type: "SET_CANCEL_FUNCTION",
          cancelFunction: cancelUpload,
        });
      });
    },
    [addUploadActor]
  );

  // Start all idle uploads
  const startAll = useCallback(() => {
    if (!uploadActors || typeof uploadActors.forEach !== "function") return;
    uploadActors.forEach((actor) => {
      const state = actor.getSnapshot();
      if (state.matches("idle")) {
        actor.send({ type: "START" });
      }
    });
  }, [uploadActors]);

  // Retry all failed uploads
  const retryAll = useCallback(() => {
    if (!uploadActors || typeof uploadActors.forEach !== "function") return;
    uploadActors.forEach((actor) => {
      const state = actor.getSnapshot();
      if (state.matches("failure")) {
        actor.send({ type: "RETRY_ALL" });
      }
    });
  }, [uploadActors]);

  // Cancel all active uploads
  const cancelAll = useCallback(() => {
    if (!uploadActors || typeof uploadActors.forEach !== "function") return;
    uploadActors.forEach((actor) => {
      const state = actor.getSnapshot();
      if (
        state.matches("uploading") ||
        state.matches("gettingUrl") ||
        state.matches("notifying")
      ) {
        actor.send({ type: "CANCEL" });
      }
    });
  }, [uploadActors]);

  // Retry specific upload (retry all)
  const retryUpload = useCallback(
    (id: string) => {
      const actor = uploadActors.get(id);
      if (actor) {
        const state = actor.getSnapshot();
        if (state.matches("failure")) {
          actor.send({ type: "RETRY_ALL" });
        }
      }
    },
    [uploadActors]
  );

  // Retry current step
  const retryStep = useCallback(
    (id: string) => {
      const actor = uploadActors.get(id);
      if (actor) {
        const state = actor.getSnapshot();
        if (state.matches("failure")) {
          actor.send({ type: "RETRY_STEP" });
        }
      }
    },
    [uploadActors]
  );

  // Cancel specific upload
  const cancelUpload = useCallback(
    (id: string) => {
      const actor = uploadActors.get(id);
      if (actor) {
        const state = actor.getSnapshot();
        if (
          state.matches("uploading") ||
          state.matches("gettingUrl") ||
          state.matches("notifying")
        ) {
          // Get the cancellation function from our stored map
          const cancelFunction = cancellationFunctions.current.get(id);
          if (cancelFunction && typeof cancelFunction === "function") {
            console.log(`Calling cancelFunction for upload ${id}`);
            cancelFunction();
          }
          actor.send({ type: "CANCEL" });
        }
      }
    },
    [uploadActors]
  );

  // Remove specific upload
  const removeUpload = useCallback(
    (id: string) => {
      const actor = uploadActors.get(id);
      if (actor) {
        actor.stop();
        removeUploadActor(id);
        // Clean up cancellation function
        cancellationFunctions.current.delete(id);
      }
    },
    [uploadActors, removeUploadActor]
  );

  // Clear all uploads
  const clearAll = useCallback(() => {
    if (uploadActors && typeof uploadActors.forEach === "function") {
      uploadActors.forEach((actor) => {
        actor.stop();
      });
    }
    clearUploadActors();
    // Clean up all cancellation functions
    cancellationFunctions.current.clear();
  }, [uploadActors, clearUploadActors]);

  // Get upload details
  const getUploadDetails = useCallback(
    (id: string) => {
      if (!uploadActors || typeof uploadActors.get !== "function") return null;
      const actor = uploadActors.get(id);
      if (!actor) return null;

      const state = actor.getSnapshot();
      const context = state.context;

      // Check if file exists in context
      if (!context.file) return null;

      return {
        id,
        file: context.file,
        state: state.value,
        progress: context.progress,
        error: context.error,
        result: context.result,
      };
    },
    [uploadActors]
  );

  // Get all upload details
  const getAllUploadDetails = useCallback(() => {
    if (!uploadActors || typeof uploadActors.keys !== "function") return [];
    return Array.from(uploadActors.keys())
      .map((id) => getUploadDetails(id))
      .filter(Boolean);
  }, [uploadActors, getUploadDetails]);

  return {
    // State
    uploadActors,
    summary,
    hasActiveUploads,

    // Actions
    addFiles,
    startAll,
    retryAll,
    cancelAll,
    retryUpload,
    retryStep,
    cancelUpload,
    removeUpload,
    clearAll,

    // Getters
    getUploadDetails,
    getAllUploadDetails,
  };
};
