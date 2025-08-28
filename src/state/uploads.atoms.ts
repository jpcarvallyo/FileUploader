import { atom } from "jotai";
import type { ActorRef } from "xstate";
import type { uploadMachine } from "../machines/uploadMachine";

// Store actor references for each upload
export const uploadActorsAtom = atom<
  Map<string, ActorRef<typeof uploadMachine>>
>(new Map());

// Derived atoms for upload IDs
export const uploadIdsAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    return [];
  }
  return Array.from(actors.keys());
});

// Summary atoms
export const uploadSummaryAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    return {
      total: 0,
      uploading: 0,
      success: 0,
      failure: 0,
      cancelled: 0,
    };
  }

  let total = 0;
  let uploading = 0;
  let success = 0;
  let failure = 0;
  let cancelled = 0;

  actors.forEach((actor) => {
    const state = actor.getSnapshot();
    total++;

    if (
      state.matches("uploading") ||
      state.matches("gettingUrl") ||
      state.matches("notifying")
    ) {
      uploading++;
    } else if (state.matches("success")) {
      success++;
    } else if (state.matches("failure")) {
      failure++;
    } else if (state.matches("cancelled")) {
      cancelled++;
    }
  });

  return {
    total,
    uploading,
    success,
    failure,
    cancelled,
  };
});

// Actions
export const addUploadActorAtom = atom(
  null,
  (get, set, id: string, actor: ActorRef<typeof uploadMachine>) => {
    const actors = get(uploadActorsAtom);
    const newActors = actors ? new Map(actors) : new Map();
    newActors.set(id, actor);
    set(uploadActorsAtom, newActors);
  }
);

export const removeUploadActorAtom = atom(null, (get, set, id: string) => {
  const actors = get(uploadActorsAtom);
  if (!actors) return;
  const newActors = new Map(actors);
  newActors.delete(id);
  set(uploadActorsAtom, newActors);
});

export const clearUploadActorsAtom = atom(null, (get, set) => {
  set(uploadActorsAtom, new Map());
});

// Helper atoms for specific upload states
export const uploadingCountAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    return 0;
  }

  let count = 0;

  actors.forEach((actor) => {
    const state = actor.getSnapshot();
    if (
      state.matches("uploading") ||
      state.matches("gettingUrl") ||
      state.matches("notifying")
    ) {
      count++;
    }
  });

  return count;
});

export const hasActiveUploadsAtom = atom((get) => {
  return get(uploadingCountAtom) > 0;
});
