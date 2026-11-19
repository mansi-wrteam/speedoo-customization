import * as Slider from "@radix-ui/react-slider";
import Skeleton from "react-loading-skeleton";
import { useState } from "react";
import type React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";

export interface PriceSliderProps {
  values?: number[];
  setValues: React.Dispatch<React.SetStateAction<number[]>>;
  minPrice?: number | null;
  maxPrice?: number | null;
  setTempMinPrice: React.Dispatch<React.SetStateAction<number | null>>;
  setTempMaxPrice: React.Dispatch<React.SetStateAction<number | null>>;
}

const PriceSlider = ({
  values,
  setValues,
  minPrice,
  maxPrice,
  setTempMinPrice,
  setTempMaxPrice,
}: PriceSliderProps) => {
  const [showMinTooltips, setMinShowTooltips] = useState(false);
  const [showMaxTooltips, setMaxShowTooltips] = useState(false);

  const setting = useSelector((state: RootState) => state?.Setting?.setting);

  const currentValues = values?.length === 2 ? values : [minPrice, maxPrice];

  return (
    <div className="w-full">
      {minPrice === null ||
      maxPrice === null ||
      typeof minPrice === "undefined" ||
      typeof maxPrice === "undefined" ? (
        <Skeleton height={15} />
      ) : (
        <div className="relative">
          <Slider.Root
            defaultValue={[minPrice, maxPrice]}
            min={minPrice}
            max={maxPrice}
            value={currentValues as number[]}
            step={0.01}
            className="relative flex h-15 w-full touch-none select-none items-center"
            onValueChange={(newValues) => {
              setValues(newValues);
            }}
            onValueCommit={(newValues) => {
              setTempMinPrice(newValues[0]);
              setTempMaxPrice(newValues[1]);
              setMinShowTooltips(false);
              setMaxShowTooltips(false);
            }}
          >
            <Slider.Track className="relative h-[15px] w-full grow rounded-full bg-[var(--surface-default)] border border-[var(--border-subtle)]">
              <Slider.Range className="absolute h-full rounded-full bg-[var(--brand-background-default)]" />
            </Slider.Track>

            <Slider.Thumb
              className="w-[25px] h-[25px] absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-background-default)] border-4 border-[var(--surface-default)] drop-shadow-md focus:outline-none cursor-pointer group"
              onMouseEnter={() => setMinShowTooltips(true)}
              onMouseLeave={() => setMinShowTooltips(false)}
              onFocus={() => setMinShowTooltips(true)}
              onBlur={() => setMinShowTooltips(false)}
            >
              {showMinTooltips && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--surface-inverse)] px-2 py-1 text-base text-[var(--foreground-inverse)] whitespace-nowrap z-10">
                  {setting?.currency}
                  {currentValues[0]?.toFixed(2)}
                  <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--surface-inverse)]"></div>
                </div>
              )}
            </Slider.Thumb>

            <Slider.Thumb
              className="w-[25px] h-[25px] absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-background-default)] border-4 border-[var(--surface-default)] drop-shadow-md focus:outline-none cursor-pointer group"
              onMouseEnter={() => setMaxShowTooltips(true)}
              onMouseLeave={() => setMaxShowTooltips(false)}
              onFocus={() => setMaxShowTooltips(true)}
              onBlur={() => setMaxShowTooltips(false)}
            >
              {showMaxTooltips && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--surface-inverse)] px-2 py-1 text-base text-[var(--foreground-inverse)] whitespace-nowrap z-10">
                  {setting?.currency}
                  {currentValues[1]?.toFixed(2)}
                  <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--surface-inverse)]"></div>
                </div>
              )}
            </Slider.Thumb>
          </Slider.Root>
        </div>
      )}
    </div>
  );
};

export default PriceSlider;
