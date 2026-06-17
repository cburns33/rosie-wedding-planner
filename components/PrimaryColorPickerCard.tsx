"use client";

import { useState } from "react";
import type { PrimaryColorPicker } from "@/lib/types";
import { PRIMARY_COLOR_OPTIONS } from "@/lib/colors/primary-colors";

interface PrimaryColorPickerCardProps {
  picker: PrimaryColorPicker;
  onConfirm: (picks: string[]) => void;
  disabled?: boolean;
}

export default function PrimaryColorPickerCard({
  picker,
  onConfirm,
  disabled = false,
}: PrimaryColorPickerCardProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(hex: string) {
    if (disabled) return;
    setSelected((prev) => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 2) return prev;
      return [...prev, hex];
    });
  }

  function handleConfirm() {
    if (selected.length !== 2 || disabled) return;
    onConfirm(selected);
  }

  return (
    <div className="flex justify-start w-full">
      <div className="w-full max-w-[85%] rounded-[20px] border border-border bg-white shadow-[0_0_0_1px_rgba(44,40,37,0.04),0_4px_16px_rgba(44,40,37,0.06)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-cream/60">
          <p className="text-[11px] tracking-widest uppercase text-warm-light">
            Primary colors
          </p>
          <p className="text-sm text-warm-mid mt-1">
            {picker.hint ?? "Pick two colors to anchor your palette."}
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PRIMARY_COLOR_OPTIONS.map((color) => {
              const isSelected = selected.includes(color.hex);
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => toggle(color.hex)}
                  disabled={disabled || (!isSelected && selected.length >= 2)}
                  aria-pressed={isSelected}
                  aria-label={`${color.name}, ${isSelected ? "selected" : "not selected"}`}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-[transform,background-color,border-color] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blush/40 disabled:opacity-40 active:scale-[0.96] ${
                    isSelected
                      ? "border-blush bg-blush-pale/80"
                      : "border-border bg-cream/40 hover:bg-blush-pale/40"
                  }`}
                >
                  <span
                    className="w-full h-10 rounded border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs text-warm-dark">{color.name}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-warm-light">
            {selected.length === 0
              ? "Choose 2 colors"
              : selected.length === 1
                ? "Choose 1 more"
                : "Ready to continue"}
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled || selected.length !== 2}
            className="inline-flex items-center rounded-full bg-blush text-white text-sm px-4 py-2.5 min-h-[44px] hover:bg-blush/90 active:scale-[0.96] transition-[transform,background-color] duration-150 ease-out disabled:opacity-50"
          >
            These are my picks
          </button>
        </div>
      </div>
    </div>
  );
}
