import { useAtom, useSetAtom } from "jotai";
import React, { useCallback, useRef } from "react";
import { createActor } from "xstate";
import {
  uploadMachine,
  UploadState,
  UploadEventType,
} from "../machines/uploadMachine";
import { getUploadUrl, uploadFile, notifyCompletion } from "../api/mocks";
import {
  uploadActorsAtom,
  uploadSummaryAtom,
  uploadSummaryStateAtom,
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
  const setSummaryState = useSetAtom(uploadSummaryStateAtom);

  // Subscribe to actor state changes and update summary
  React.useEffect(() => {
    if (!uploadActors || typeof uploadActors.forEach !== "function") return;

    const updateSummary = () => {
      let total = 0;
      let uploading = 0;
      let success = 0;
      let failure = 0;
      let cancelled = 0;

      uploadActors.forEach((actor) => {
        const state = actor.getSnapshot();
        total++;

        if (
          state.matches(UploadState.UPLOADING) ||
          state.matches(UploadState.GETTING_URL) ||
          state.matches(UploadState.NOTIFYING)
        ) {
          uploading++;
        } else if (state.matches(UploadState.SUCCESS)) {
          success++;
        } else if (state.matches(UploadState.FAILURE)) {
          failure++;
        } else if (state.matches(UploadState.CANCELLED)) {
          cancelled++;
        }
      });

      setSummaryState({
        total,
        uploading,
        success,
        failure,
        cancelled,
      });
    };

    // Initial update
    updateSummary();

    // Subscribe to all actors
    const subscriptions: Array<() => void> = [];

    uploadActors.forEach((actor) => {
      const subscription = actor.subscribe(() => {
        updateSummary();
      });
      subscriptions.push(subscription.unsubscribe);
    });

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [uploadActors, setSummaryState]);

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

        // Start the upload process
        actor.start();

        // Set the initial context
        actor.send({
          type: UploadEventType.SET_INITIAL_CONTEXT,
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
          actor.send({ type: UploadEventType.START });
        }, 10);

        // Handle the upload process

        // Create a cancellation token for this upload
        let isCancelled = false;

        // Store the cancellation function in the actor's context
        const cancelUpload = () => {
          isCancelled = true;
        };

        // Upload process function
        const startUploadProcess = async () => {
          try {
            // Step 1: Get upload URL
            actor.send({ type: UploadEventType.GETTING_URL });
            const uploadUrlResponse = await getUploadUrl(file.name, file.size);

            if (isCancelled) {
              return;
            }

            // Update context with upload URL (keep original uploadId)
            actor.send({
              type: UploadEventType.URL_RECEIVED,
              uploadId: id, // Use our original uploadId, not the API response id
              uploadUrl: uploadUrlResponse.uploadUrl,
            });

            // Step 2: Upload file
            actor.send({ type: UploadEventType.UPLOADING });
            const uploadResult = await uploadFile(
              uploadUrlResponse.uploadUrl,
              file,
              (progress) => {
                if (isCancelled) return;
                // Send progress updates (removed console logs)
                actor.send({ type: UploadEventType.PROGRESS, value: progress });
              },
              () => isCancelled
            );

            if (isCancelled) {
              return;
            }

            // Step 3: Notify completion (simplified - go directly to success)
            await notifyCompletion(uploadResult.id, file.name);

            if (isCancelled) {
              return;
            }

            // Step 4: Success
            actor.send({ type: "SUCCESS", result: uploadResult });
          } catch (error) {
            if (isCancelled) {
              return;
            }
            // Handle error
            actor.send({
              type: "ERROR",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        };

        // Start the upload process
        setTimeout(startUploadProcess, 100); // Small delay to ensure actor is ready

        // Store the upload process function so it can be restarted
        const uploadProcessRef = { current: startUploadProcess };

        // Store the restart function in our cancellation map
        cancellationFunctions.current.set(`${id}_restart`, () => {
          setTimeout(() => {
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
      if (state.matches(UploadState.IDLE)) {
        actor.send({ type: UploadEventType.START });
      }
    });
  }, [uploadActors]);

  // Retry all failed uploads
  const retryAll = useCallback(() => {
    if (!uploadActors || typeof uploadActors.forEach !== "function") return;
    uploadActors.forEach((actor) => {
      const state = actor.getSnapshot();
      // Only retry failed uploads, not cancelled ones
      if (
        state.matches(UploadState.FAILURE) &&
        !state.matches(UploadState.CANCELLED)
      ) {
        actor.send({ type: UploadEventType.RETRY_ALL });

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
          if (restartFunction && typeof restartFunction === "function") {
            restartFunction();
          }
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
        if (state.matches(UploadState.FAILURE)) {
          actor.send({ type: UploadEventType.RETRY_ALL });
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
        if (
          state.matches(UploadState.FAILURE) &&
          !state.matches(UploadState.CANCELLED)
        ) {
          actor.send({ type: UploadEventType.RETRY_STEP });
          // Restart the upload process - find the restart function for this specific upload
          const restartKey = `${id}_restart`;
          const restartFunction = cancellationFunctions.current.get(restartKey);
          if (restartFunction && typeof restartFunction === "function") {
            restartFunction();
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
          state.matches(UploadState.UPLOADING) ||
          state.matches(UploadState.GETTING_URL) ||
          state.matches(UploadState.NOTIFYING)
        ) {
          // Get the cancellation function from our stored map
          const cancelFunction = cancellationFunctions.current.get(id);
          if (cancelFunction && typeof cancelFunction === "function") {
            cancelFunction();
          }
          actor.send({ type: UploadEventType.CANCEL });
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
