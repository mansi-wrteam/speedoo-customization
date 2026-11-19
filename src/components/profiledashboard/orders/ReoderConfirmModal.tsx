import React from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import * as api from "@/api/apiRoutes";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import { useSelector, useDispatch } from "react-redux";
import {
  setCartProducts,
  setCartSubTotal,
  setDoorStepDeliveryMode,
  setSelfPickupMode,
} from "@/redux/slices/cartSlice";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Numeric } from "@/types/common";
import type { Order } from "@/types/models";

export interface ReoderConfirmModalProps {
  showReoderModal: boolean;
  setShowReorderModal: React.Dispatch<React.SetStateAction<boolean>>;
  order?: Order;
}

const ReoderConfirmModal = ({
  showReoderModal,
  setShowReorderModal,
  order,
}: ReoderConfirmModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const city = useSelector((state: RootState) => state.City.city);

  const handleHideReorder = () => {
    setShowReorderModal(false);
  };

  const handleReoder = async () => {
    try {
      const variantIds = order?.items
        ?.map((prdct) => prdct?.variant_id)
        ?.join(",");
      const quantity = order?.items?.map((prdct) => prdct?.quantity)?.join(",");
      const response = await api.addToBulkCart({
        variant_ids: variantIds,
        quantities: quantity,
      });
      if (response.status == 1) {
        toast.success(t("items_added_to_cart"));
        setShowReorderModal(false);
        await fetchCart();
      } else {
        toast.error(t(response?.message as string));
        setShowReorderModal(false);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const fetchCart = async () => {
    try {
      const cartData = await api.getCart({
        latitude: city?.latitude,
        longitude: city?.longitude,
      });
      if (cartData.status == 1) {
        dispatch(setCartSubTotal({ data: cartData?.data?.sub_total }));
        dispatch(setSelfPickupMode({ data: cartData?.data?.self_pickup_mode as Numeric | undefined }));
        dispatch(setDoorStepDeliveryMode({data:cartData?.data?.doorstep_delivery_mode as Numeric | undefined}))
        const productsData = cartData?.data?.cart?.map((product) => {
          return {
            product_id: product?.product_id,
            product_variant_id: product?.product_variant_id,
            qty: product?.qty,
          };
        });
        dispatch(setCartProducts({ data: productsData! }));
      } else {
        dispatch(setCartProducts({ data: [] }));
        dispatch(setCartSubTotal({ data: 0 }));
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  return (
    <Dialog open={showReoderModal}>
      <DialogOverlay
        className={`${theme == "light" ? "bg-white/80" : "bg-black/80"}`}
      />
      <DialogContent>
        <div>
          <h1 className="font-bold">{t("reorder")}</h1>
          <h1 className="font-bold">{t("reOrder_warning")}</h1>
          <div className="flex gap-2 mt-3">
            <button
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
              onClick={handleHideReorder}
            >
              {" "}
              {t("cancel")}
            </button>
            <button
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
              onClick={handleReoder}
            >
              {t("Ok")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReoderConfirmModal;
