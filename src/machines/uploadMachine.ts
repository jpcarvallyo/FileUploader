import { createMachine, assign } from "xstate";
import type { UploadProgress } from "../api/mocks";

export interface UploadContext {
  file: File | null;
  uploadId: string | null;
  uploadUrl: string | null;
  progress: UploadProgress | null;
  result: unknown;
  error: string | null;
  cancelFunction?: () => void;
}

export type UploadEvent =
  | { type: "START" }
  | { type: "GETTING_URL" }
  | { type: "URL_RECEIVED"; uploadId: string; uploadUrl: string }
  | { type: "UPLOADING" }
  | { type: "NOTIFYING" }
  | { type: "SUCCESS"; result: unknown }
  | { type: "ERROR"; error: string }
  | { type: "PROGRESS"; value: UploadProgress }
  | { type: "RETRY_STEP" }
  | { type: "RETRY_ALL" }
  | { type: "CANCEL" }
  | { type: "SET_CANCEL_FUNCTION"; cancelFunction: () => void };

export const uploadMachine = createMachine({
  id: "upload",
  initial: "idle",
  context: {
    file: null,
    uploadId: null,
    uploadUrl: null,
    progress: null,
    result: null,
    error: null,
    cancelFunction: undefined,
  } as UploadContext,
  on: {
    SET_CANCEL_FUNCTION: {
      actions: assign({
        cancelFunction: (_, event) => (event as any)?.cancelFunction,
      }),
    },
    SET_INITIAL_CONTEXT: {
      actions: assign((_, event) => (event as any)?.context || {}),
    },
    PROGRESS: {
      actions: assign(({ event }) => {
        const progress = (event as any)?.value;
        return { progress };
      }),
    },
  },
  states: {
    idle: {
      on: {
        START: {
          target: "gettingUrl",
        },
      },
    },
    gettingUrl: {
      on: {
        GETTING_URL: {
          // Stay in gettingUrl state while getting URL
        },
        URL_RECEIVED: {
          target: "uploading",
          actions: assign({
            uploadId: (_, event) => (event as any)?.uploadId ?? null,
            uploadUrl: (_, event) => (event as any)?.uploadUrl ?? null,
          }),
        },
        ERROR: {
          target: "failure",
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },
        RETRY_STEP: {
          target: "gettingUrl",
        },
        CANCEL: {
          target: "cancelled",
        },
      },
    },
    uploading: {
      on: {
        UPLOADING: {
          // Stay in uploading state while uploading
        },
        NOTIFYING: {
          target: "notifying",
        },
        SUCCESS: {
          target: "success",
          actions: assign({
            result: (_, event) => (event as any)?.result ?? null,
          }),
        },
        ERROR: {
          target: "failure",
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },

        RETRY_STEP: {
          target: "uploading",
        },
        CANCEL: {
          target: "cancelled",
        },
      },
    },
    notifying: {
      on: {
        SUCCESS: {
          target: "success",
          actions: assign({
            result: (_, event) => (event as any)?.result ?? null,
          }),
        },
        ERROR: {
          target: "failure",
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },
        RETRY_STEP: {
          target: "notifying",
        },
        CANCEL: {
          target: "cancelled",
        },
      },
    },
    success: {
      type: "final",
    },
    failure: {
      on: {
        RETRY_ALL: {
          target: "gettingUrl",
          actions: assign({
            error: null,
            progress: null,
            result: null,
            // Preserve other context properties
            uploadId: (context) => context.uploadId,
            uploadUrl: (context) => context.uploadUrl,
            file: (context) => context.file,
            cancelFunction: (context) => context.cancelFunction,
          }),
        },
        RETRY_STEP: {
          target: "gettingUrl",
        },
      },
    },
    cancelled: {
      type: "final",
    },
  },
});
