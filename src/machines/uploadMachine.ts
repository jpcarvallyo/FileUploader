import { createMachine, assign } from "xstate";
import type { UploadProgress } from "../api/mocks";

// Upload state constants for type safety
export const UploadState = {
  IDLE: "idle",
  GETTING_URL: "gettingUrl",
  UPLOADING: "uploading",
  NOTIFYING: "notifying",
  SUCCESS: "success",
  FAILURE: "failure",
  CANCELLED: "cancelled",
} as const;

export type UploadStateType = (typeof UploadState)[keyof typeof UploadState];

// Upload event constants for type safety
export const UploadEventType = {
  START: "START",
  GETTING_URL: "GETTING_URL",
  URL_RECEIVED: "URL_RECEIVED",
  UPLOADING: "UPLOADING",
  NOTIFYING: "NOTIFYING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
  PROGRESS: "PROGRESS",
  RETRY_STEP: "RETRY_STEP",
  RETRY_ALL: "RETRY_ALL",
  CANCEL: "CANCEL",
  SET_CANCEL_FUNCTION: "SET_CANCEL_FUNCTION",
  SET_INITIAL_CONTEXT: "SET_INITIAL_CONTEXT",
} as const;

export type UploadEventTypeType =
  (typeof UploadEventType)[keyof typeof UploadEventType];

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
  | { type: typeof UploadEventType.START }
  | { type: typeof UploadEventType.GETTING_URL }
  | {
      type: typeof UploadEventType.URL_RECEIVED;
      uploadId: string;
      uploadUrl: string;
    }
  | { type: typeof UploadEventType.UPLOADING }
  | { type: typeof UploadEventType.NOTIFYING }
  | { type: typeof UploadEventType.SUCCESS; result: unknown }
  | { type: typeof UploadEventType.ERROR; error: string }
  | { type: typeof UploadEventType.PROGRESS; value: UploadProgress }
  | { type: typeof UploadEventType.RETRY_STEP }
  | { type: typeof UploadEventType.RETRY_ALL }
  | { type: typeof UploadEventType.CANCEL }
  | {
      type: typeof UploadEventType.SET_CANCEL_FUNCTION;
      cancelFunction: () => void;
    }
  | {
      type: typeof UploadEventType.SET_INITIAL_CONTEXT;
      context: Partial<UploadContext>;
    };

export const uploadMachine = createMachine({
  id: "upload",
  initial: UploadState.IDLE,
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
    [UploadEventType.SET_CANCEL_FUNCTION]: {
      actions: assign({
        cancelFunction: (_, event) => (event as any)?.cancelFunction,
      }),
    },
    [UploadEventType.SET_INITIAL_CONTEXT]: {
      actions: assign((_, event) => (event as any)?.context || {}),
    },
    [UploadEventType.PROGRESS]: {
      actions: assign(({ event }) => {
        const progress = (event as any)?.value;
        return { progress };
      }),
    },
  },
  states: {
    [UploadState.IDLE]: {
      on: {
        [UploadEventType.START]: {
          target: UploadState.GETTING_URL,
        },
      },
    },
    [UploadState.GETTING_URL]: {
      on: {
        [UploadEventType.GETTING_URL]: {
          // Stay in gettingUrl state while getting URL
        },
        [UploadEventType.URL_RECEIVED]: {
          target: UploadState.UPLOADING,
          actions: assign({
            uploadId: (_, event) => (event as any)?.uploadId ?? null,
            uploadUrl: (_, event) => (event as any)?.uploadUrl ?? null,
          }),
        },
        [UploadEventType.ERROR]: {
          target: UploadState.FAILURE,
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },
        [UploadEventType.RETRY_STEP]: {
          target: UploadState.GETTING_URL,
        },
        [UploadEventType.CANCEL]: {
          target: UploadState.CANCELLED,
        },
      },
    },
    [UploadState.UPLOADING]: {
      on: {
        [UploadEventType.UPLOADING]: {
          // Stay in uploading state while uploading
        },
        [UploadEventType.NOTIFYING]: {
          target: UploadState.NOTIFYING,
        },
        [UploadEventType.SUCCESS]: {
          target: UploadState.SUCCESS,
          actions: assign({
            result: (_, event) => (event as any)?.result ?? null,
          }),
        },
        [UploadEventType.ERROR]: {
          target: UploadState.FAILURE,
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },
        [UploadEventType.RETRY_STEP]: {
          target: UploadState.UPLOADING,
        },
        [UploadEventType.CANCEL]: {
          target: UploadState.CANCELLED,
        },
      },
    },
    [UploadState.NOTIFYING]: {
      on: {
        [UploadEventType.SUCCESS]: {
          target: UploadState.SUCCESS,
          actions: assign({
            result: (_, event) => (event as any)?.result ?? null,
          }),
        },
        [UploadEventType.ERROR]: {
          target: UploadState.FAILURE,
          actions: assign({
            error: (_, event) => (event as any)?.error ?? "Unknown error",
          }),
        },
        [UploadEventType.RETRY_STEP]: {
          target: UploadState.NOTIFYING,
        },
        [UploadEventType.CANCEL]: {
          target: UploadState.CANCELLED,
        },
      },
    },
    [UploadState.SUCCESS]: {
      type: "final",
    },
    [UploadState.FAILURE]: {
      on: {
        [UploadEventType.RETRY_ALL]: {
          target: UploadState.GETTING_URL,
          actions: assign({
            error: null,
            progress: null,
            result: null,
          }),
        },
        [UploadEventType.RETRY_STEP]: {
          target: UploadState.GETTING_URL,
        },
      },
    },
    [UploadState.CANCELLED]: {
      type: "final",
    },
  },
});
