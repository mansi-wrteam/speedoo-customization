import React from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import { useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import { clearAllFilter } from "@/redux/slices/productFilterSlice";
import {
  logoutAuth,
  setJWTToken,
  setCurrentUser,
  setAuthType,
} from "@/redux/slices/userSlice";
import {
  setCart,
  setCartProducts,
  setCartSubTotal,
  setIsGuest,
} from "@/redux/slices/cartSlice";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";

export interface DeleteModalProps {
  showDelete: boolean;
  setShowDelete: React.Dispatch<React.SetStateAction<boolean>>;
}

const DeleteModal = ({ showDelete, setShowDelete }: DeleteModalProps) => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.User);
  const theme = useSelector((state: RootState) => state.Theme.theme);

  const handleHideDelete = () => {
    setShowDelete(false);
  };

  const handleDelete = async () => {
    try {
      const response = await api.deleteUser({ uid: user?.authId });
      if (response.status == 1) {
        if (user?.authType == "phone" || user?.authType == "google") {
          // const user = auth.currentUser;
          try {
            // const res = await user.delete();
            dispatch(clearAllFilter());
            dispatch(logoutAuth());
            dispatch(setJWTToken({ data: "" }));
            dispatch(setCurrentUser({ data: null }));
            dispatch(setCart({ data: [] }));
            dispatch(setCartProducts({ data: [] }));
            dispatch(setCartSubTotal({ data: 0 }));
            dispatch(setCartProducts({ data: [] }));
            dispatch(setIsGuest({ data: true }));
            router.push("/");
            setShowDelete(false);
            toast.success(response.message);
          } catch (error) {
            console.log("error", error);
          }
        } else {
          dispatch(clearAllFilter());
          dispatch(logoutAuth());
          dispatch(setJWTToken({ data: "" }));
          dispatch(setCurrentUser({ data: null }));
          dispatch(setCart({ data: [] }));
          dispatch(setCartProducts({ data: [] }));
          dispatch(setCartSubTotal({ data: 0 }));
          dispatch(setCartProducts({ data: [] }));
          dispatch(setIsGuest({ data: true }));
          router.push("/");
          setShowDelete(false);
          toast.success(response.message);
        }
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  return (
    <Dialog open={showDelete}>
      <DialogOverlay
        className={`${theme == "light" ? "bg-white/80" : "bg-black/80"}`}
      />
      <DialogContent>
        <div>
          <h1 className="font-bold">{t("delete")}</h1>
          <h1 className="font-bold">{t("delete_user_message")}</h1>
          <div className="flex gap-2 mt-3">
            <button
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
              onClick={handleHideDelete}
            >
              {" "}
              {t("cancel")}
            </button>
            <button
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
              onClick={handleDelete}
            >
              {t("Ok")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;
