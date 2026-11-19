import React, { useEffect, useState } from "react";
import StatusOne from "@/assets/statusIcons/status_icon_awaiting_payment.svg";
import StatusTwo from "@/assets/statusIcons/status_icon_received.svg";
import StatusThree from "@/assets/statusIcons/status_icon_process.svg";
import StatusFour from "@/assets/statusIcons/status_icon_shipped.svg";
import StatusFive from "@/assets/statusIcons/status_icon_out_for_delivery.svg";
import StatusSix from "@/assets/statusIcons/status_icon_delivered.svg";
import StatusSeven from "@/assets/statusIcons/status_icon_cancel.svg";
import StatusEight from "@/assets/statusIcons/status_icon_returned.svg";
import Image from "next/image";
import { t } from "@/utils/translation";
import type { StaticImageData } from "next/image";
import type { DateString, Numeric } from "@/types/common";
import type { Order } from "@/types/models";

export interface OrderStepperProps {
  orderDetail: Order;
}

interface StatusMapping {
  icon: StaticImageData;
  label: string;
}

interface OrderStep {
  icon: StaticImageData | undefined;
  label: string;
  timestamp: DateString;
}

const OrderStepper = ({ orderDetail }: OrderStepperProps) => {
  const statusMappings: Record<Numeric, StatusMapping> = {
    1: { icon: StatusOne, label: t("paymentPending") },
    2: { icon: StatusTwo, label: t("order_status_display_name_recieved") },
    3: { icon: StatusThree, label: t("processed") },
    4: { icon: StatusFour, label: t("shipped") },
    5: { icon: StatusFive, label: t("out_for_delivery") },
    6: { icon: StatusSix, label: t("order_status_display_name_delivered") },
    7: { icon: StatusSeven, label: t("cancelled") },
    8: { icon: StatusEight, label: t("returned") },
    9: { icon: StatusThree, label: t("order_status_display_name_recieved") },
    10: { icon: StatusTwo, label: t("ready_to_pickup") },
    11: { icon: StatusSix, label: t("picked") },
  };

  const [steps, setSteps] = useState<OrderStep[] | undefined>([]);
  useEffect(() => {
    handleGetSteps();
  }, [orderDetail]);

  const handleGetSteps = () => {
    const updatedSteps = orderDetail?.status?.map(([statusCode, timestamp]) => {
      const status = statusMappings[statusCode] || {};
      return {
        icon: status.icon,
        label: `${t("your_order_has_been")} ${status.label}`,
        // timestamp: new Date(timestamp).toLocaleString("en-US", {
        //   day: "2-digit",
        //   month: "short",
        //   year: "numeric",
        //   hour: "2-digit",
        //   minute: "2-digit",
        //   hour12: true,
        // }),
        timestamp,
      };
    });
    setSteps(updatedSteps);
  };

  return (
    <div className="rounded-lg p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      {steps?.map((status, index) => (
        <div key={index} className="flex items-start gap-4 mb-12 last:mb-0">
          {/* Icon */}
          <div className="relative">
            <div className="w-12 h-12 flex items-center justify-center rounded-3xl bg-[var(--brand-background-default)] outline outline-1 -outline-offset-1 outline-[var(--brand-foreground-on-brand)]">
              <Image
                src={status?.icon?.src as string}
                alt="icon"
                height={24}
                width={24}
                className="h-2/3 w-full"
              />
            </div>
            {index < steps.length - 1 && (
              <div className="absolute top-12 left-1/2 w-3.5 h-20 md:h-28 lg:h-20 bg-[var(--brand-foreground-default)] transform -translate-x-1/2"></div>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1">
            <p className="text-sm font-normal leading-5 text-[var(--foreground-primary)]">{status.label}</p>
            <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{status.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderStepper;
