"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show the "SupportPilot" text label alongside the logo */
  showLabel?: boolean;
  /** Additional className for the wrapper */
  className?: string;
  /** Additional className for the label text */
  labelClassName?: string;
}

const sizeMap = {
  sm: { img: 28, wrapper: "h-8 w-8", text: "text-base" },
  md: { img: 36, wrapper: "h-10 w-10", text: "text-xl" },
  lg: { img: 52, wrapper: "h-14 w-14", text: "text-2xl" },
};

export function Logo({
  size = "sm",
  showLabel = true,
  className,
  labelClassName,
}: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative flex-shrink-0", s.wrapper)}>
        <Image
          src="/logo.png"
          alt="SupportPilot"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-bold tracking-tight truncate",
            s.text,
            labelClassName
          )}
        >
          SupportPilot
        </span>
      )}
    </div>
  );
}

/** Logo mark only (no label) — for favicons, collapsed sidebar, etc. */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="SupportPilot"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
