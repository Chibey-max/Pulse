"use client";

import { useId, useState } from "react";
import { MdAdd } from "react-icons/md";
import { cn } from "@/lib/cn";
import type { FaqItem } from "./types";

// === Types

export interface FaqProps {
  items: readonly FaqItem[];
  /* Only one answer open at a time. Set false to allow many. */
  singleOpen?: boolean;
  /* Index open on first render, or null for all closed. */
  defaultOpen?: number | null;
  className?: string;
}

// === Helpers

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// === Component

/*
  Data-driven accordion. Pass an array; it renders. The answer height animates with a
  grid-template-rows 0fr -> 1fr transition, which needs no height measuring in JS and is
  covered by the global reduced-motion backstop. Each row carries a slug id so answers
  are deep-linkable (e.g. /faq#what-can-i-lose).
*/
export function Faq({ items, singleOpen = true, defaultOpen = 0, className }: FaqProps) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(defaultOpen === null ? [] : [defaultOpen]),
  );

  function toggle(index: number): void {
    setOpen((current) => {
      const next = new Set(singleOpen ? [] : current);
      if (current.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((item, index) => {
        const isOpen = open.has(index);
        const slug = slugify(item.question);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <li
            key={item.question}
            id={slug}
            className={cn(
              "scroll-mt-navbar border-border border-b first:border-t",
              isOpen && "bg-bg-panel/60",
            )}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-h3 text-text-primary flex items-baseline gap-3 font-medium">
                  <span className="text-caption text-text-muted font-mono">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "border-border-bright text-text-muted flex size-6 shrink-0 items-center justify-center rounded-full border transition-transform duration-300",
                    isOpen && "text-signal rotate-45",
                  )}
                >
                  <MdAdd size={16} />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="text-body text-text-secondary max-w-2xl pb-5">{item.answer}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
