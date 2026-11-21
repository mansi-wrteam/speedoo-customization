import { useSelector } from "react-redux";
import { formatAmount } from "@/lib/utils";
import type { RootState } from "@/types/state";

export const useMoney = () => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const currency = setting?.currency ?? "";
  const decimals = setting?.decimal_point;
  return (value: unknown) => `${currency}${formatAmount(value as number, decimals ?? 2)}`;
};
