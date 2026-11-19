import React, { useState } from "react";
import { useSelector } from "react-redux";
import { t } from "@/utils/translation";
import { formatPriceDisplay } from "@/lib/utils";
import { KigenCheckbox, KigenRadio } from "../common/KigenControls";
import {
  getEffectiveMax,
  getOptionPrice,
  getAddonName,
  getSelectionType,
  groupShowsPrice,
  isOptionDiscounted,
} from "@/utils/addonUtils";
import type { LiveAddonGroup } from "@/utils/addonUtils";
import type { Id } from "@/types/common";
import type { AddonSelections } from "@/types/models";
import type { RootState } from "@/types/state";

export interface AddonGroupsListProps {
  /** `getAddonGroups(product)` — live groups with live options only. */
  groups: LiveAddonGroup[];
  /** `{ [groupId]: optionId[] }` */
  selections: AddonSelections;
  setSelections: React.Dispatch<React.SetStateAction<AddonSelections>>;
  /**
   * Two-column tiles, long groups collapsed — for the quick view, where the
   * groups share a column with the rest of the product. The Customise sheet
   * keeps the full-width rows.
   */
  compact?: boolean;
}

// Number of picks in one group before the "Clear" link appears (§1.3).
const CLEAR_LINK_THRESHOLD = 5;

// Options shown per group in compact mode before "Show more".
const COMPACT_VISIBLE_OPTIONS = 6;

// Keeps the inputs controlled; the surrounding row owns the toggle.
const noop = () => {};

// The add-on groups of the Customise sheet (§3.2), shared with the food
// module's quick view so it can pick add-ons inline instead of stacking a
// second modal on top of itself.
const AddonGroupsList = ({
  groups,
  selections,
  setSelections,
  compact = false,
}: AddonGroupsListProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleOption = (group: LiveAddonGroup, optionId: Id) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      // single → radio: picking swaps, never refuses. Pressing the selected
      // option again clears it — add-ons are never mandatory, and a single
      // group has no Clear link, so otherwise a pick could never be undone.
      if (getSelectionType(group) === "single") {
        return {
          ...prev,
          [group.id]: current.includes(optionId) ? [] : [optionId],
        };
      }
      // A ticked option always stays live so it can be undone.
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= getEffectiveMax(group)) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const clearGroup = (groupId: Id) =>
    setSelections((prev) => ({ ...prev, [groupId]: [] }));

  if (compact) {
    return (
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const picked = selections[group.id] || [];
          const isMultiple = getSelectionType(group) === "multiple";
          const max = getEffectiveMax(group);
          const atCap = picked.length >= max;
          const showPrice = groupShowsPrice(group);
          const expanded = !!expandedGroups[group.id];
          const canCollapse = group.options.length > COMPACT_VISIBLE_OPTIONS;
          // A picked option stays visible when collapsed, so a selection
          // never disappears from view.
          const visibleOptions =
            expanded || !canCollapse
              ? group.options
              : group.options.filter(
                  (option, idx) =>
                    idx < COMPACT_VISIBLE_OPTIONS || picked.includes(option.id)
                );
          const hiddenCount = group.options.length - visibleOptions.length;

          return (
            <div key={group.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-sm font-semibold leading-5 text-[var(--foreground-primary)]">
                    {getAddonName(group)}
                  </div>
                  {group?.translations?.sub_title ? (
                    <div className="text-xs leading-4 text-[var(--foreground-tertiary)] line-clamp-2">
                      {group.translations.sub_title}
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-medium leading-4 text-[var(--foreground-secondary)]">
                  {picked.length > 0
                    ? `${picked.length} ${t("selected")}`
                    : isMultiple
                      ? `${t("optional")} · ${t("addon_up_to")} ${max}`
                      : `${t("optional")} · ${t("addon_pick_one")}`}
                </span>
              </div>

              {/* Columns follow the panel's width, not the viewport: in the
                  narrow quick-view column a 2-up grid left room for "Ex…". */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                {visibleOptions.map((option) => {
                  const checked = picked.includes(option.id);
                  const disabled = isMultiple && atCap && !checked;
                  return (
                    // Same toggle contract as the rows below: the real input
                    // inside the Kigen control carries focus and keyboard, and
                    // its click bubbles up to this onClick.
                    <div
                      key={option.id}
                      className={`flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                        checked
                          ? "border-[var(--brand-border-default)] bg-[var(--brand-background-subtle)]"
                          : "border-[var(--border-default)] bg-[var(--surface-default)]"
                      } ${
                        disabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:border-[var(--brand-border-default)]"
                      }`}
                      onClick={() => !disabled && toggleOption(group, option.id)}
                    >
                      {isMultiple ? (
                        <KigenCheckbox checked={checked} disabled={disabled} onChange={noop} />
                      ) : (
                        <KigenRadio checked={checked} onChange={noop} />
                      )}
                      {/* Name gets the full width (two lines), price sits under it. */}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          title={getAddonName(option)}
                          className="line-clamp-2 break-words text-sm leading-5 text-[var(--foreground-primary)]"
                        >
                          {getAddonName(option)}
                        </span>
                        {showPrice ? (
                          <span className="flex flex-wrap items-baseline gap-x-1.5 text-xs leading-4">
                            <span className="font-semibold text-[var(--foreground-secondary)]">
                              +{setting?.currency}
                              {formatPriceDisplay(getOptionPrice(option))}
                            </span>
                            {isOptionDiscounted(option) ? (
                              <span className="text-[var(--foreground-tertiary)] line-through">
                                {setting?.currency}
                                {formatPriceDisplay(option?.price)}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>

              {canCollapse || (isMultiple && picked.length >= CLEAR_LINK_THRESHOLD) ? (
                <div className="flex items-center justify-between gap-3">
                  {canCollapse ? (
                    <button
                      type="button"
                      className="text-sm font-medium leading-5 text-[var(--brand-foreground-default)]"
                      onClick={() =>
                        setExpandedGroups((prev) => ({ ...prev, [group.id]: !expanded }))
                      }
                    >
                      {expanded ? t("showLess") : `${t("showMore")} (${hiddenCount})`}
                    </button>
                  ) : (
                    <span />
                  )}
                  {isMultiple && picked.length >= CLEAR_LINK_THRESHOLD ? (
                    <button
                      type="button"
                      className="text-sm leading-5 text-[var(--status-error-default)]"
                      onClick={() => clearGroup(group.id)}
                    >
                      {t("clear")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const picked = selections[group.id] || [];
        const isMultiple = getSelectionType(group) === "multiple";
        const atCap = picked.length >= getEffectiveMax(group);
        const showPrice = groupShowsPrice(group);
        // Clear appears only for multiple groups, and only once the
        // customer has ticked five or more options in it (§1.3).
        const showClear = isMultiple && picked.length >= CLEAR_LINK_THRESHOLD;

        return (
          <div key={group.id} className="p-4 flex flex-col gap-1">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                  {getAddonName(group)}
                </div>
                {group?.translations?.sub_title ? (
                  <div className="text-xs font-medium leading-4 text-[var(--foreground-tertiary)]">
                    {group.translations.sub_title}
                  </div>
                ) : null}
              </div>
              {showClear ? (
                <button
                  type="button"
                  className="shrink-0 text-sm font-normal leading-5 text-[var(--status-error-default)]"
                  onClick={() => clearGroup(group.id)}
                >
                  {t("clear")}
                </button>
              ) : null}
            </div>
            <div className="rounded-xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] overflow-hidden">
              {group.options.map((option, idx) => {
                const checked = picked.includes(option.id);
                // Once a multiple group hits its cap the remaining
                // unticked options go disabled (§1.3).
                const disabled = isMultiple && atCap && !checked;
                return (
                  <div
                    key={option.id}
                    className={`p-3 flex items-center gap-2 ${
                      idx < group.options.length - 1
                        ? "border-b border-[var(--border-subtle)]"
                        : ""
                    } ${checked ? "bg-[var(--surface-subtle)]" : ""} ${
                      disabled ? "opacity-50" : "cursor-pointer"
                    }`}
                    onClick={() => !disabled && toggleOption(group, option.id)}
                  >
                    {/* The row's onClick is the only toggle: the
                        control's click bubbles up to it, so an onChange
                        that also toggled would cancel itself out. */}
                    {isMultiple ? (
                      <KigenCheckbox
                        checked={checked}
                        disabled={disabled}
                        onChange={noop}
                      />
                    ) : (
                      <KigenRadio checked={checked} onChange={noop} />
                    )}
                    <span className="flex-1 text-sm font-normal leading-5 text-[var(--foreground-secondary)] line-clamp-1">
                      {getAddonName(option)}
                    </span>
                    {showPrice ? (
                      <span className="flex items-baseline gap-1">
                        <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                          {setting?.currency}
                          {formatPriceDisplay(getOptionPrice(option))}
                        </span>
                        {isOptionDiscounted(option) ? (
                          <span className="text-xs font-normal text-[var(--foreground-tertiary)] line-through">
                            {setting?.currency}
                            {formatPriceDisplay(option?.price)}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default AddonGroupsList;
