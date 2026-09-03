import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { type CtaSize, type CtaVariant, ctaClasses } from "./styles";

// === Types

export interface CtaLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  variant: CtaVariant;
  size?: CtaSize;
  href: string;
  /* Force an external <a>. Auto-detected for http(s) and mailto hrefs otherwise. */
  external?: boolean;
  children: ReactNode;
}

// === Helper

function isExternal(href: string, explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return /^(https?:|mailto:|tel:)/.test(href);
}

// === Component

/*
  A link styled as a CtaButton. Internal hrefs route through next/link; external ones
  render a plain <a> with the safe rel. Created now so the FAQ preview on the landing
  page can drop in a "View all questions" link to /faq immediately.
*/
export function CtaLink({
  variant,
  size,
  href,
  external,
  className,
  children,
  ...props
}: CtaLinkProps) {
  const classes = ctaClasses({ variant, size, className });

  if (isExternal(href, external)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
