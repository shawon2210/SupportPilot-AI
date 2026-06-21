"use client";

import dynamic from "next/dynamic";

export const BarChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.BarChart })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").BarChart>>;

export const Bar = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.Bar })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").Bar>>;

export const XAxis = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.XAxis })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").XAxis>>;

export const YAxis = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.YAxis })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").YAxis>>;

export const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").CartesianGrid>>;

export const Tooltip = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.Tooltip })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").Tooltip>>;

export const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
) as React.ComponentType<React.ComponentProps<typeof import("recharts").ResponsiveContainer>>;
