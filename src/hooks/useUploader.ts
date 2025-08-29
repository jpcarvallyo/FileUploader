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
  hasFailedUploadsAtom,
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
  const [hasFailedUploads] = useAtom(hasFailedUploadsAtom);
  const addUploadActor = useSetAtom(addUploadActorAtom);
  const removeUploadActor = useSetAtom(removeUploadActorAtom);
  const clearUploadActors = useSetAtom(clearUploadActorsAtom);

  // Store cancellation functions for each upload
  const cancellationFunctions = useRef(new Map<string, () => void>());
  const fileInfoMap = useRef(new Map<string, { name: string; size: number }>());

  // Add files and create actors for each
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      fileArray.forEach(async (file) => {
        const id = `upload_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Store file information
        fileInfoMap.current.set(id, { name: file.name, size: file.size });

        // Create actor with file in context
        const actor = createActor(uploadMachine, {
          input: { file },
        });

        // Add actor to store
        addUploadActor(id, actor);
        console.log(`Actor created with ID: ${id}`);

        // Start the upload process
        actor.start();
        console.log(`Actor started for ID: ${id}`);

        // Set the initial context
        actor.send({
          type: "SET_INITIAL_CONTEXT",
          context: {
            file,
            uploadId: id,
            uploadUrl: null,
            progress: null,
            result: null,
            error: null,
          },
        });

        // Small delay to ensure context is set before sending START
        setTimeout(() => {
          // Send START event
          actor.send({ type: "START" });
          console.log(`START event sent for ID: ${id}`);
        }, 10);

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

        // Upload process function
        const startUploadProcess = async () => {
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

            // Update context with upload URL (keep original uploadId)
            actor.send({
              type: "URL_RECEIVED",
              uploadId: id, // Use our original uploadId, not the API response id
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
            console.log(
              `Sending ERROR event to actor ${id} with error:`,
              error instanceof Error ? error.message : "Unknown error"
            );
            // Handle error
            actor.send({
              type: "ERROR",
              error: error instanceof Error ? error.message : "Unknown error",
            });
            console.log(`ERROR event sent to actor ${id}`);
          }
        };

        // Start the upload process
        setTimeout(startUploadProcess, 100); // Small delay to ensure actor is ready

        // Store the upload process function so it can be restarted
        const uploadProcessRef = { current: startUploadProcess };

        // Store the restart function in our cancellation map
        cancellationFunctions.current.set(`${id}_restart`, () => {
          console.log(`Restarting upload process for ${id}`);
          console.log(`About to call uploadProcessRef.current for ${id}`);
          setTimeout(() => {
            console.log(`Executing uploadProcessRef.current for ${id}`);
            uploadProcessRef.current();
          }, 100);
        });

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
      // Only retry failed uploads, not cancelled ones
      if (state.matches("failure") && !state.matches("cancelled")) {
        console.log(`Retrying failed upload ${actor.id}`);
        console.log(`Actor state before retry:`, state.value);
        console.log(`Actor context before retry:`, state.context);
        actor.send({ type: "RETRY_ALL" });

        // Get the state after sending RETRY_ALL to see if uploadId is preserved
        const stateAfterRetry = actor.getSnapshot();
        console.log(`Actor state after retry:`, stateAfterRetry.value);
        console.log(`Actor context after retry:`, stateAfterRetry.context);

        // Restart the upload process - find the restart function for this specific upload
        // Find the upload ID by looking through the uploadActors map
        let uploadId = null;
        uploadActors.forEach((uploadActor, id) => {
          if (uploadActor === actor) {
            uploadId = id;
          }
        });

        if (uploadId) {
          const restartKey = `${uploadId}_restart`;
          const restartFunction = cancellationFunctions.current.get(restartKey);
          console.log(
            `Found upload ID: ${uploadId}, looking for restart key: ${restartKey}`
          );
          console.log(
            `All cancellation functions:`,
            Array.from(cancellationFunctions.current.keys())
          );
          if (restartFunction && typeof restartFunction === "function") {
            console.log(`Calling restart function for ${restartKey}`);
            restartFunction();
          } else {
            console.log(`No restart function found for ${restartKey}`);
          }
        } else {
          console.log(`Could not find upload ID for actor ${actor.id}`);
        }
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
          console.log(`Retrying upload ${id} from beginning`);
          actor.send({ type: "RETRY_ALL" });
          // Restart the upload process
          const restartFunction = cancellationFunctions.current.get(
            `${id}_restart`
          );
          if (restartFunction && typeof restartFunction === "function") {
            restartFunction();
          }
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
        // Only retry failed uploads, not cancelled ones
        if (state.matches("failure") && !state.matches("cancelled")) {
          console.log(`Retrying step for upload ${id}`);
          actor.send({ type: "RETRY_STEP" });
          // Restart the upload process - find the restart function for this specific upload
          const restartKey = `${id}_restart`;
          const restartFunction = cancellationFunctions.current.get(restartKey);
          console.log(
            `Looking for restart key: ${restartKey}, found function:`,
            restartFunction
          );
          if (restartFunction && typeof restartFunction === "function") {
            console.log(`Calling restart function for ${restartKey}`);
            restartFunction();
          } else {
            console.log(`No restart function found for ${restartKey}`);
          }
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
    hasFailedUploads,
    fileInfoMap: fileInfoMap.current,

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
