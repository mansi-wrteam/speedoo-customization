import React from "react";
import { useSelector } from "react-redux";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { GoPlusCircle } from "react-icons/go";
import AddressCard from "../cards/AddressCard";
import { t } from "@/utils/translation";
import type { RootState } from "@/types/state";

export interface AddressPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Reloads the list after an add, edit or delete. */
  fetchAddress: () => void;
  /** Opens/closes the address form. AddressCard calls it with `true` to edit. */
  setShowAddressForm: (show: boolean) => void;
  /** AddressCard sets this to `true` so the form edits `selectedEditAddress`. */
  setIsAddressSelected: (selected: boolean) => void;
}

/**
 * The address picker behind "Edit" on the checkout header (§1.2).
 *
 * This list used to be step 1 of the old flow. Selection, edit and delete all
 * live in AddressCard, which writes the chosen address to
 * `Checkout.address` — so closing this sheet is what tells checkout to
 * reprice (§1.3).
 */
const AddressPickerModal = ({
  open,
  onClose,
  fetchAddress,
  setShowAddressForm,
  setIsAddressSelected,
}: AddressPickerModalProps) => {
  const addresses = useSelector((state: RootState) => state.Addresses);
  const list = addresses?.allAddresses || [];

  return (
    <Dialog open={open}>
      <DialogContent className="flex w-[560px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
          <DialogTitle className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
            {t("choose_delivery_address")}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground-secondary)]"
          >
            <RiCloseFill size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {list.map((address) => (
            <AddressCard
              key={address?.id}
              address={address}
              setShowAddAddres={setShowAddressForm}
              setIsAddressSelected={setIsAddressSelected}
              fetchAddress={fetchAddress}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              setIsAddressSelected(false);
              setShowAddressForm(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-default)] px-4 py-3 text-sm font-medium leading-5 text-[var(--button-link-foreground-default)]"
          >
            <GoPlusCircle size={18} />
            {t("add_address")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressPickerModal;
