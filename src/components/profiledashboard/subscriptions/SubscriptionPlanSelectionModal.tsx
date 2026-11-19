import React, { useEffect, useState } from "react";
import { X, Truck, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes"
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";
import type { SubscriptionPlan } from "@/types/models";

export interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  setAddWalletModal: React.Dispatch<React.SetStateAction<boolean>>;
}




const PlanSelectionModal = ({
  isOpen,
  onClose,
  selectedPlan,
  onSelectPlan,
  setAddWalletModal,
}: PlanSelectionModalProps) => {

  const [plans, setPlans] = useState<SubscriptionPlan[] | undefined>([]);

  const setting = useSelector((state: RootState) => state.Setting.setting);

  useEffect(() => {
    handleFetchPlans();
  }, []);

  const handleFetchPlans = async () => {
    try {
      const plans = await api.getSubscriptionPlans();
      setPlans(plans?.data?.plans);
    } catch (error) {
      console.log("error", error)
    }
  };


  const handleSetWalletModal = () => {
    if (!selectedPlan) {
      toast.error(t("please_select_a_plan"));
      return;
    }
    onClose();
    setAddWalletModal(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[650px] w-full p-0 gap-0 rounded-2xl overflow-hidden bg-[var(--surface-default)] focus-visible:outline-none focus:outline-none"
      >
        <DialogHeader className="p-4 border-b border-[var(--border-default)] space-y-0">
          <DialogTitle asChild>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-[var(--foreground-primary)]">
                  {t("choose_your_plan")}
                </h2>
                <p className="text-base font-normal text-[var(--foreground-tertiary)]">
                  {t("select_subscription_desc")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-3 text-[var(--button-link-foreground-default)] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 flex flex-col items-end gap-6">
          <div className="w-full flex flex-col gap-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
            {plans?.map((plan) => (
              <div
                key={plan.id}
                onClick={() => onSelectPlan(plan)}
                className={`w-full p-4 rounded-2xl border cursor-pointer flex flex-col gap-3 transition-all bg-[var(--background-default)] ${
                  selectedPlan?.id === plan.id
                    ? "border-[var(--brand-border-default)]"
                    : "border-[var(--border-subtle)]"
                }`}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="text-base font-semibold text-[var(--foreground-primary)]">
                    {plan?.translations?.name}
                  </span>
                  <span className="text-sm font-normal text-[var(--brand-foreground-inverse)] bg-[var(--brand-background-default)] py-1 px-2 rounded-full">
                    {plan.days} {t("days")}
                  </span>
                  <div className="flex-1 flex justify-end items-center gap-4">
                    <div className="flex items-center gap-[5px]">
                      <span className="text-base font-bold text-[var(--foreground-primary)]">
                        {setting?.currency}{(plan.discounted_price as number) > 0 ? plan.discounted_price!.toFixed(2) : plan.price!.toFixed(2)}
                      </span>
                      {(plan.discounted_price as number) > 0 && (
                        <span className="text-base font-normal line-through text-[var(--foreground-tertiary)]">
                          {setting?.currency}{plan.price!.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedPlan?.id === plan.id
                          ? "border-[var(--radio-selected-border)]"
                          : "border-[var(--radio-unselected-border)]"
                      }`}
                    >
                      {selectedPlan?.id === plan.id && (
                        <div className="w-3 h-3 rounded-full bg-[var(--radio-selected-background)]" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded-lg flex items-center gap-2 bg-[var(--surface-subtle)]">
                  <Truck className="w-5 h-5 text-[var(--foreground-tertiary)] shrink-0" />
                  <span className="text-sm font-normal text-[var(--foreground-tertiary)]">
                    {t("free_delivery_on")} {setting?.currency}
                    {plan.free_delivery_above}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            className="flex items-center gap-1 text-base font-medium bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] text-[var(--button-primary-foreground-default)] py-2 px-4 rounded-lg transition-colors"
            onClick={handleSetWalletModal}
          >
            {t("proceed_to_payment")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanSelectionModal;
