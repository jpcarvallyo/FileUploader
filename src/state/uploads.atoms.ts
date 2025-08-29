import { atom } from "jotai";
import type { ActorRef } from "xstate";

// Store actor references for each upload
export const uploadActorsAtom = atom<Map<string, ActorRef<any, any>>>(
  new Map()
);

// Derived atoms for upload IDs
export const uploadIdsAtom = atom((get) => {
  const actors = get(uploadActorsAtom);
  if (!actors || typeof actors.keys !== "function") {
    return [];
  }
  return Array.from(actors.keys());
});

// Writable summary state
export const uploadSummaryStateAtom = atom<{
  total: number;
  uploading: number;
  success: number;
  failure: number;
  cancelled: number;
}>({
  total: 0,
  uploading: 0,
  success: 0,
  failure: 0,
  cancelled: 0,
});

// Summary atoms (read-only, derived from state)
export const uploadSummaryAtom = atom((get) => {
  return get(uploadSummaryStateAtom);
});

// Actions
export const addUploadActorAtom = atom(
  null,
  (get, set, id: string, actor: ActorRef<any, any>) => {
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

export const clearUploadActorsAtom = atom(null, (_get, set) => {
  set(uploadActorsAtom, new Map());
});
