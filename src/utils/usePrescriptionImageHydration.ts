import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { hydratePrescriptionImages } from "@/redux/slices/checkoutSlice";
import {
  getImage,
  getAllImageIds,
  deleteImage,
} from "@/utils/prescriptionImageStore";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";

type HydratedImage = { file: File | Blob; preview: string };

// Runs once per page load. redux-persist restores the prescription groups with
// metadata only, so pull each image's blob back out of IndexedDB and rebuild
// the File + object URL the cart UI and the place-order FormData need.
let hydrated = false;

export const usePrescriptionImageHydration = () => {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  const rehydrated = useSelector((state: RootState) => state._persist?.rehydrated);

  useEffect(() => {
    if (hydrated) return;
    // Wait for redux-persist to put the groups back before reading the store,
    // otherwise the sweep below would delete blobs that are about to be needed.
    // (`groups` starts as [], so it can't tell us that; the persist flag can.)
    if (!rehydrated || !groups) return;
    hydrated = true;

    let cancelled = false;

    (async () => {
      const wanted = groups
        .flatMap((g) => g.images || [])
        .filter((img) => img?.imageId && !img.file)
        .map((img) => img.imageId);

      if (wanted.length) {
        const entries = await Promise.all(
          wanted.map(async (imageId): Promise<[string, HydratedImage] | null> => {
            const file = await getImage(imageId);
            if (!file) return null;
            return [
              imageId,
              { file, preview: URL.createObjectURL(file) },
            ];
          })
        );
        if (cancelled) return;
        dispatch(
          hydratePrescriptionImages({
            byId: Object.fromEntries(entries.filter(Boolean) as [string, HydratedImage][]),
          })
        );
      }

      // Sweep blobs no group references any more (group deleted while the tab
      // was closed, order placed, cart emptied…) so the store can't grow forever.
      const referenced = new Set(
        groups.flatMap((g) => (g.images || []).map((img) => img?.imageId))
      );
      const stored = await getAllImageIds();
      await Promise.all(
        stored
          .filter((id) => !referenced.has(id as string))
          .map((id) => deleteImage(id as string))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [groups, rehydrated, dispatch]);
};
