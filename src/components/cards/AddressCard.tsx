import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setSelectedAddresForEdit,
  setSelectedAddress,
} from "@/redux/slices/addressSlice";
import { setAddress } from "@/redux/slices/checkoutSlice";
import * as api from "@/api/apiRoutes";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { BiEditAlt } from "react-icons/bi";
import { RiDeleteBinLine } from "react-icons/ri";
import { t } from "@/utils/translation";
import { BsThreeDotsVertical } from "react-icons/bs";
import { KigenCheckbox } from "@/components/common/KigenControls";
import { isRtl } from "@/lib/utils";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { Address } from "@/types/models";

export interface AddressCardProps {
  address: Address;
  setShowAddAddres: (show: boolean) => void;
  setIsAddressSelected: (selected: boolean) => void;
  /** Reloads the address list after a delete. */
  fetchAddress: () => void;
  /** Read-only summary: hides the default-address note, the checkbox and edit/delete. */
  finalOrderAddress?: boolean;
  /** Profile address book: hides the "deliver here" checkbox and type label. */
  fromAddress?: boolean;
}

const AddressCard = ({
  address,
  setShowAddAddres,
  setIsAddressSelected,
  fetchAddress,
  finalOrderAddress,
  fromAddress,
}: AddressCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const rtl = isRtl();

  const checkout = useSelector((state: RootState) => state.Checkout);
  const selectedAddress = useSelector(
    (state: RootState) => state.Addresses.selectedAddress,
  );
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<Id | null>(null); // Track selected address ID

  const formattedAddress = `${address?.address}, ${address?.landmark}, ${address?.area}, ${address?.city}, ${address?.state}, ${address?.pincode}-${address?.country}`;

  const handleDeleteAdress = async () => {
    try {
      const response = await api.deleteAddress({ id: address.id });
      if (response.status === 1) {
        fetchAddress();
        dispatch(setSelectedAddresForEdit({ data: null }));
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleEditAddress = () => {
    setShowAddAddres(true);
    setIsAddressSelected(true);
    dispatch(setSelectedAddresForEdit({ data: address }));
  };

  const handleCheckboxChange = () => {
    dispatch(setAddress({ data: address }));
  };

  return (
    <div>
      <div className="flex w-full flex-col gap-4 border-b border-[var(--border-subtle)] p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
              {t("delivery_to")}:{" "}
              <span className="font-semibold">{address?.name}</span>
            </h2>
            {address?.is_default === 1 && !finalOrderAddress && (
              <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                {t("default_address_msg")}
              </p>
            )}
          </div>
          {!fromAddress && (
            <label
              htmlFor={`default-address-${address.id}`}
              className="flex cursor-pointer items-center justify-end gap-2 py-2 pl-6 pr-2"
            >
              {!finalOrderAddress && (
                <KigenCheckbox
                  name={`default-address-${address.id}`}
                  checked={checkout?.address?.id === address?.id}
                  onChange={handleCheckboxChange}
                />
              )}

              <span className="line-clamp-1 text-sm font-normal leading-5 text-[var(--foreground-primary)] opacity-75">
                {address?.type}
              </span>
            </label>
          )}
        </div>

        <p className="text-base font-normal leading-6 text-[var(--foreground-primary)]">
          {formattedAddress}
        </p>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-subtle)] p-2">
          <p className="flex-1 text-base font-medium leading-6 text-[var(--foreground-tertiary)]">
            {t("phone")}: <span className="font-medium">{address?.mobile}</span>
          </p>
          {!finalOrderAddress && (
            <div className="hidden items-center gap-2 md:flex">
              <button
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]"
                onClick={handleEditAddress}
              >
                <BiEditAlt size={16} />
                {t("edit")}
              </button>
              <span className="h-10 w-px bg-[var(--border-default)]"></span>
              <button
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]"
                onClick={() => setShowDeleteModal(true)}
              >
                <RiDeleteBinLine size={16} />
                {t("delete")}
              </button>
            </div>
          )}
          {/* Three Dots Button and Action Popup */}
          {!finalOrderAddress && (
            <div className="flex md:hidden items-center relative">
              <button
                onClick={() => setShowActionModal(!showActionModal)}
                className="p-1"
              >
                <BsThreeDotsVertical />
              </button>

              {/* Action Popup Menu */}
              {showActionModal && (
                <>
                  {/* Invisible backdrop to close the menu when clicking outside */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionModal(false)}
                  ></div>

                  <div className="absolute right-0 top-8 z-20 w-32 overflow-hidden rounded-lg bg-[var(--surface-default)] shadow-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                    <div className="flex flex-col gap-2  ml-4">
                      <button
                        className="flex items-center gap-1 p-1 text-base font-medium leading-6 text-[var(--button-link-foreground-default)]"
                        onClick={() => {
                          handleEditAddress();
                          setShowActionModal(false);
                        }}
                      >
                        <BiEditAlt size={16} />
                        {t("edit")}
                      </button>
                      <button
                        className="flex items-center gap-1 p-1 text-base font-medium leading-6 text-[var(--button-link-foreground-default)]"
                        onClick={() => {
                          setShowDeleteModal(true);
                          setShowActionModal(false);
                        }}
                      >
                        <RiDeleteBinLine size={18} />
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialog open={showDeleteModal}>
        <DialogOverlay
          className={`${theme === "light" ? "bg-white/80" : "bg-black/80"}`}
        />
        <DialogContent className="rounded-2xl border-0 bg-[var(--surface-default)]">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
              {t("delete_address")}
            </h1>
            <p className="text-base font-normal leading-6 text-[var(--foreground-secondary)]">
              {t("delete_address_message")}
            </p>
            <div className="flex gap-4 mt-3 justify-end">
              <button
                className="rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-destructive-background-default)] text-[var(--button-destructive-foreground-default)] transition-colors hover:bg-[var(--button-destructive-background-hover)]"
                onClick={handleDeleteAdress}
              >
                {t("Ok")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressCard;
