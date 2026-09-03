import type { ButtonHTMLAttributes } from "react";
import { type CtaSize, type CtaVariant, ctaClasses } from "./styles";

// === Types

export interface CtaButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant: CtaVariant;
  size?: CtaSize;
  type?: "button" | "submit" | "reset";
}

// === Component

/*
  The one button. `variant` carries primary vs secondary; everything else is a normal
  <button>. For a link that looks like a button, use CtaLink instead.
*/
export function CtaButton({
  variant,
  size,
  type = "button",
  className,
  children,
  ...props
}: CtaButtonProps) {
  return (
    <button type={type} className={ctaClasses({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
