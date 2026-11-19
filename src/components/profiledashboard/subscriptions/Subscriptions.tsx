import { t } from "@/utils/translation";
import { ArrowRight, HelpCircle, Wallet } from "lucide-react";
import React, { useEffect, useState } from "react";
import LightImage from "@/assets/Vector-filled.svg";
import BikeImage from "@/assets/bike.svg";
import MaskedIcon from "@/components/common/MaskedIcon";
import PlanSelectionModal from "./SubscriptionPlanSelectionModal";
import WalletBalanceModal from "../wallet/WalletBalanceModal";
import SubscriptionsFaqs from "./SubscriptionsFaqs";
import { useSelector } from "react-redux";
import { FiCalendar, FiCheck, FiClock, FiTruck } from "react-icons/fi";
import * as api from "@/api/apiRoutes"
import type { RootState } from "@/types/state";
import type { Faq, SubscriptionPlan, UserActivePlan } from "@/types/models";

const Subscription = () => {

  const user = useSelector((state: RootState) => state.User.user);
  const setting = useSelector((state: RootState) => state.Setting.setting);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [addWalletModal, setAddWalletModal] = useState(false);
  const [isFaqsModalOpen, setIsFaqsModalOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<UserActivePlan>([] as unknown as UserActivePlan)
  const [subscriptionFaqs, setSubscriptionFaqs] = useState<Faq[]>([])
  const [totalFaqs, setTotalFaqs] = useState(0)
  const [offset, setOffset] = useState(0)
  const [faqLoading, setFaqLoading] = useState(false)


  const faqLimit = 10;

  useEffect(() => {
    getActivePlan();
    fetchSubscriptionFaqs();
  }, []);

  const fetchSubscriptionFaqs = async (isLoadMore = false) => {
    // "Load more" asks for the next page; the first load starts at 0.
    const nextOffset = isLoadMore ? offset + faqLimit : 0;
    try {
      setFaqLoading(true)
      const response = await api.getSubscriptionFaqs({ offset: nextOffset, limit: faqLimit })

      setTotalFaqs(response.total as number)
      setOffset(nextOffset);
      if (isLoadMore) {
        setSubscriptionFaqs([...subscriptionFaqs, ...response.data]);
      } else {
        setSubscriptionFaqs(response.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setFaqLoading(false)
    }
  }

  const onSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  }

  const getActivePlan = async () => {
    try {
      const response = await api.getUserActivePlan()
      setActivePlan(response.data);
    } catch (error) {
      console.log(error);
    }
  }

  const handleFaqOpen = () => {
    setIsFaqsModalOpen(true);
  }

  return (
    <div className="w-full mx-auto h-fit overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      {user?.has_active_subscription == 1 ? (
        <div>
          <div className="w-full bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h2 className="p-4 flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
              {user?.subscription_name}
            </h2>
          </div>
          <div className="w-full flex flex-col gap-6 p-6">
            <div className="p-4 flex items-center gap-6 rounded-2xl bg-[var(--surface-subtle)]">
              <div className="h-12 w-12 p-2 rounded-full bg-[var(--surface-default)] flex items-center justify-center flex-shrink-0">
                <span className="h-8 w-8 rounded-full bg-[var(--brand-foreground-default)] flex items-center justify-center">
                  <FiCheck size={16} strokeWidth={3} className="text-[var(--brand-foreground-inverse)]" />
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <p className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("your_plan_is_active")}</p>
                <p className="text-base font-normal leading-6 text-[var(--foreground-tertiary)]">{`${t("your_plan_is_active_desc")} ${user?.subscription_name} ${t('membership')}`}</p>
              </div>
            </div>

            {/* Brand tokens, not status ones: this is a plan highlight, so it has to
                follow the active module's theme rather than the system warning colour. */}
            <div className="p-2 flex items-center gap-2 rounded-xl bg-[var(--brand-background-subtle)] outline outline-1 -outline-offset-1 outline-[var(--brand-border-default)]">
              <div className="h-10 w-10 rounded-lg bg-[var(--brand-background-default)] flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6 text-[var(--brand-foreground-inverse)]" />
              </div>
              <p className="flex-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {t("you_saved")} <span> {setting?.currency}{activePlan?.total_money_saved}</span> {t('on')} {activePlan?.deliveries_number} {t('deliveries')}
              </p>
            </div>

            {/* 3. Current Plan Details */}
            <div className="flex flex-col gap-2 rounded-lg">
              <h3 className="text-lg font-medium leading-7 text-[var(--foreground-primary)]">{t('current_plan')}</h3>
              <div className="p-4 flex flex-col gap-4 rounded-2xl bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                <div className="flex justify-between items-center gap-2">
                  <p className="flex-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">{activePlan?.plan_name}</p>
                  <span className="px-2 py-1 rounded-full bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)] text-sm font-normal leading-4">{t('active')}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-2 rounded-lg bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                  <div className={`flex flex-col gap-1 ${(activePlan?.days_remaining as number) > 1 ? 'md:border-r md:border-[var(--border-subtle)]' : ''}`}>
                    <div className="flex items-center gap-1">
                      <FiCalendar className="w-5 h-5 opacity-75 text-[var(--foreground-tertiary)] flex-shrink-0" />
                      <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t('expires_on')}</p>
                    </div>
                    <p className="pl-6 text-base font-medium leading-6 text-[var(--foreground-primary)]">{(activePlan?.days_remaining as number) > 1 ? user?.subscription_expiry_date : t('today')}</p>
                  </div>
                  {(activePlan?.days_remaining as number) > 1 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-5 h-5 opacity-75 text-[var(--foreground-tertiary)] flex-shrink-0" />
                        <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t('days_remaining')}</p>
                      </div>
                      <p className="pl-6 text-base font-medium leading-6 text-[var(--foreground-primary)]">{activePlan?.days_remaining} {(activePlan?.days_remaining as number) > 1 ? t('days') : t('day')}</p>
                    </div>
                  )}
                </div>


                <div className="p-2 flex items-center gap-2 rounded-lg bg-[var(--surface-subtle)]">
                  <FiTruck className="w-5 h-5 flex-shrink-0 text-[var(--foreground-tertiary)]" />
                  <p className="flex-1 opacity-75 text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
                    {t('free_delivery_on_orders_above')}<span className="font-semibold"> {setting?.currency}{activePlan?.free_delivery_above}</span>
                  </p>
                </div>
              </div>
            </div>
            {subscriptionFaqs?.length > 0 && (
              <div

                onClick={handleFaqOpen}
                className="rounded-xl p-4 flex items-center justify-between cursor-pointer bg-[var(--surface-subtle)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--brand-foreground-inverse)]"
                  >
                    <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-[var(--brand-foreground-default)]" />
                  </div>
                  <div>
                    <h4 className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                      {t("faqs_for_subscription")}
                    </h4>
                    <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] mt-0.5">
                      {t("get_answer_to_common_queries")}
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-[var(--foreground-primary)]" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="w-full bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h2 className="p-4 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
              {user?.subscription_name}
            </h2>
          </div>
          <div className="w-full mx-auto h-fit space-y-6 p-6">
            <div className="rounded-2xl p-5 md:p-6 bg-[var(--surface-subtle)]">
              <div className="flex gap-4 mb-6 items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-foreground-default)] p-3">
                    <MaskedIcon
                      src={LightImage}
                      color="var(--brand-foreground-inverse)"
                      className="h-10 w-10"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
                    {`${user?.subscription_name}  ${t("save_more_with_egrocermax")}`}
                  </h2>
                  <p className="text-base font-normal leading-6 text-[var(--foreground-tertiary)] mt-1">
                    {`${user?.subscription_name} ${t("save_more_with_egrocermax_desc")} `}
                  </p>
                </div>
              </div>

              <div className="h-px w-full bg-[var(--border-default)]"></div>

              <div className=" my-6 flex flex-col gap-2">
                <h3 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{t("max_benefits")}</h3>

                <div className="rounded-2xl p-2 flex items-center gap-2 bg-[var(--brand-foreground-inverse)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                  <div className="p-4 rounded-xl flex-shrink-0 bg-[var(--surface-subtle)]">
                    <MaskedIcon
                      src={BikeImage}
                      color="var(--foreground-primary)"
                      className="h-8 w-8"
                    />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                      {t("free_delivery")}
                    </h4>
                    <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] mt-0.5">
                      {t("free_delivery_perks")}
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="w-full mt-6 px-6 py-3 rounded-lg text-xl font-medium leading-7 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] flex items-center justify-center gap-1"
                onClick={() => setIsPlanModalOpen(true)}
              >
                {t("choose_your_plan")}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={handleFaqOpen}
              className="rounded-xl p-4 flex items-center justify-between cursor-pointer bg-[var(--surface-subtle)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--brand-foreground-inverse)]"
                >
                  <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-[var(--brand-foreground-default)]" />
                </div>
                <div>
                  <h4 className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                    {t("faqs_for_subscription")}
                  </h4>
                  <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] mt-0.5">
                    {t("get_answer_to_common_queries")}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--foreground-primary)]" />
            </div>
          </div>
        </div>
      )}
      <PlanSelectionModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSelectPlan={onSelectPlan}
        selectedPlan={selectedPlan}
        setAddWalletModal={setAddWalletModal}
      />
      <WalletBalanceModal
        setAddWalletModal={setAddWalletModal}
        addWalletModal={addWalletModal}
        type="subscription"
        selectedPlan={selectedPlan}
      />
      <SubscriptionsFaqs isOpen={isFaqsModalOpen} setIsOpen={setIsFaqsModalOpen} faqs={subscriptionFaqs} totalFaqs={totalFaqs} faqLoading={faqLoading} fetchSubscriptionFaqs={fetchSubscriptionFaqs} />
    </div>
  );
};

export default Subscription;
