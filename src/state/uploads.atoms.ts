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

  console.log("uploadSummaryAtom calculated:", {
    total,
    uploading,
    success,
    failure,
    cancelled,
  });

  // Force reactivity by accessing each actor's state
  actors.forEach((actor) => {
    const state = actor.getSnapshot();
    console.log(`uploadSummaryAtom: Actor ${actor.id} state:`, state.value);
  });
  return {
    total,
    uploading,
    success,
    failure,
    cancelled,
  };
});

// Create a reactive summary atom that subscribes to actor state changes
export const reactiveUploadSummaryAtom = atom((get) => {
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

  console.log("reactiveUploadSummaryAtom calculated:", {
    total,
    uploading,
    success,
    failure,
    cancelled,
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

export const hasFailedUploadsAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    console.log("hasFailedUploadsAtom: No actors found");
    return false;
  }

  let hasFailed = false;
  let totalActors = 0;

  actors.forEach((actor) => {
    totalActors++;
    const state = actor.getSnapshot();
    console.log(`hasFailedUploadsAtom: Actor ${actor.id} state:`, state.value);
    if (state.matches("failure")) {
      hasFailed = true;
      console.log(`hasFailedUploadsAtom: Found failed upload ${actor.id}`);
    }
  });

  console.log(
    `hasFailedUploadsAtom: Total actors: ${totalActors}, Has failed: ${hasFailed}`
  );
  return hasFailed;
});

// Force reactivity by subscribing to actor state changes
export const hasFailedUploadsReactiveAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    return false;
  }

  let hasFailed = false;

  actors.forEach((actor) => {
    // Force subscription to actor state by accessing it
    const state = actor.getSnapshot();
    if (state.matches("failure")) {
      hasFailed = true;
    }
  });

  return hasFailed;
});
