// Moving the device cart into the account after sign-in (WEB_PARITY_V4.0.2 §1.8).
//
// Three outcomes have to be told apart, because the right thing to do with the
// guest lines differs in each:
//
//   merged   → drop them, they are in the account now
//   refused  → drop them and say why; replaying them would fail again
//   offline  → KEEP them; the server never saw them, so next time will work
//
// The old copy of this (duplicated in Login and NewUserModal) kept every
// failure, so a permanently refused line sat in the device cart for good, and
// it merged lines from every module into whichever module was active.
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import { addtoGuestCart, setCartSubTotal, setGuestCartTotal } from "@/redux/slices/cartSlice";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { AddToCartResponse, GuestCartLine } from "@/types/models";
import type { RootState } from "@/types/state";

type Maybe<T> = T | null | undefined;

/**
 * Trap 2: a seller-mismatch refusal is recognised ONLY by the reply carrying a
 * `data` key next to `status: 0`. There is no error code.
 */
export const isSellerMismatch = (response: Maybe<AddToCartResponse>) =>
  response?.status != 1 && response?.data != null;

const hasAddons = (line: Maybe<GuestCartLine>) =>
  (line?.selected_addon_ids?.length || 0) > 0;

export interface UseGuestCartMergeOptions {
  /** Re-read the account cart once lines have landed. */
  onMerged?: () => void | Promise<void>;
}

export const useGuestCartMerge = ({ onMerged }: UseGuestCartMergeOptions = {}) => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.Cart);
  const user = useSelector((state: RootState) => state.User);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  const [merging, setMerging] = useState(false);
  /** Lines the account cart refused because it already holds another seller. */
  const [conflictLines, setConflictLines] = useState<GuestCartLine[] | null>(null);

  /**
   * The guest cart spans modules, but `cart/add` and the bulk call are scoped
   * to the X-Module-Id header. Merging another module's lines would file
   * pharmacy items under groceries, so only the active module's lines move and
   * the rest stay on the device.
   */
  const splitByModule = useCallback(() => {
    const lines = cart?.guestCart || [];
    return {
      mine: lines.filter((line) => line?.module_id == null || line?.module_id == activeModuleId),
      others: lines.filter(
        (line) => line?.module_id != null && line?.module_id != activeModuleId
      ),
    };
  }, [activeModuleId, cart?.guestCart]);

  const writeBack = (keep: GuestCartLine[], subTotal: number | null) => {
    dispatch(addtoGuestCart({ data: keep }));
    if (keep.length === 0) dispatch(setGuestCartTotal({ data: 0 }));
    if (subTotal != null) dispatch(setCartSubTotal({ data: subTotal }));
  };

  /** One line through `cart/add`, which is the call that carries the seller signal. */
  const addLine = async (line: GuestCartLine) =>
    api.addToCart({
      product_id: line?.product_id,
      product_variant_id: line?.product_variant_id,
      qty: line?.qty,
      // Must be OMITTED, not empty, on a line without add-ons.
      ...(hasAddons(line) ? { selected_addon_ids: line?.selected_addon_ids } : {}),
    });

  const mergeLines = useCallback(
    async (lines: GuestCartLine[], others: GuestCartLine[]) => {
      const plain = lines.filter((line) => !hasAddons(line));
      const withAddons = lines.filter(hasAddons);

      const keep: GuestCartLine[] = [];
      const conflicted: GuestCartLine[] = [];
      const refusals: string[] = [];
      let subTotal: number | null = null;
      let offline = false;

      /** Replay one line and sort it into merged / conflicted / refused / offline. */
      const replay = async (line: GuestCartLine) => {
        try {
          const response = await addLine(line);
          if (response?.status == 1) {
            subTotal = response?.sub_total ?? subTotal;
            return;
          }
          if (isSellerMismatch(response)) {
            conflicted.push(line);
            return;
          }
          if (response?.message) refusals.push(response.message);
        } catch (error) {
          // Never reached the server: the line is still good, keep it.
          console.log("Error", error);
          offline = true;
          keep.push(line);
        }
      };

      if (plain.length) {
        try {
          const response = await api.addToBulkCart({
            variant_ids: plain.map((line) => line.product_variant_id).join(","),
            quantities: plain.map((line) => line.qty).join(","),
          });
          if (response?.status == 1) {
            subTotal = response?.sub_total ?? subTotal;
          } else {
            // The bulk endpoint refuses all-or-nothing and its envelope always
            // carries `data`, so the seller signal can't be read from it.
            // Replaying through cart/add gives a per-line answer instead.
            for (const line of plain) await replay(line);
          }
        } catch (error) {
          console.log("Error", error);
          offline = true;
          keep.push(...plain);
        }
      }

      // `bulk_add_to_cart_items` has no add-on field, so those go one at a time.
      for (const line of withAddons) await replay(line);

      writeBack([...others, ...keep], subTotal);

      if (conflicted.length) {
        setConflictLines(conflicted);
        return;
      }
      if (refusals.length) toast.error(refusals[0]);
      if (offline) toast.info(t("guest_cart_kept_for_next_time"));
      if (keep.length === 0 && conflicted.length === 0) await onMerged?.();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, onMerged]
  );

  /** Run the merge. Safe to call whenever checkout opens — it no-ops with nothing to move. */
  const runMerge = useCallback(async () => {
    if (!user?.jwtToken || merging) return;
    const { mine, others } = splitByModule();
    if (mine.length === 0) return;
    setMerging(true);
    try {
      await mergeLines(mine, others);
    } finally {
      setMerging(false);
    }
  }, [mergeLines, merging, splitByModule, user?.jwtToken]);

  /**
   * Answer to "your cart holds one seller at a time".
   *
   * Yes replaces the account cart with the guest lines; No keeps the account
   * cart and drops them. Either way the question is not asked twice.
   */
  const resolveConflict = useCallback(
    async (replace: boolean) => {
      const lines = conflictLines || [];
      setConflictLines(null);
      const { others } = splitByModule();

      if (!replace) {
        writeBack(others, null);
        await onMerged?.();
        return;
      }

      setMerging(true);
      try {
        const cleared = await api.deleteCart();
        if (cleared?.status != 1) {
          toast.error(cleared?.message || t("something_went_wrong"));
          return;
        }
        await mergeLines(lines, others);
      } catch (error) {
        console.log("Error", error);
        toast.error(t("something_went_wrong"));
      } finally {
        setMerging(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conflictLines, mergeLines, onMerged, splitByModule]
  );

  return {
    merging,
    /** Non-null while the seller question is on screen. */
    conflictLines,
    runMerge,
    resolveConflict,
  };
};
