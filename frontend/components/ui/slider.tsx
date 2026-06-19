"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string
  min?: number
  max?: number
  step?: number
  value?: [number, number]
  defaultValue?: [number, number]
  onValueChange?: (value: [number, number]) => void
  disabled?: boolean
  label?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue = [min, max],
      onValueChange,
      disabled = false,
      label,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<[number, number]>(
      value ?? defaultValue
    )

    const isControlled = value !== undefined
    const currentValue = isControlled ? value : internalValue

    const handleChange = (index: 0 | 1, newValue: number) => {
      const clamped = Math.min(max, Math.max(min, newValue))
      const updated: [number, number] =
        index === 0
          ? [Math.min(clamped, currentValue[1]), currentValue[1]]
          : [currentValue[0], Math.max(clamped, currentValue[0])]

      if (!isControlled) {
        setInternalValue(updated)
      }
      onValueChange?.(updated)
    }

    const minPercent = ((currentValue[0] - min) / (max - min)) * 100
    const maxPercent = ((currentValue[1] - min) / (max - min)) * 100

    const formatValue = (v: number) => {
      return step < 1 ? v.toFixed(1) : v.toString()
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {label && (
          <label className="mb-2 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {/* Track */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            {/* Active range */}
            <div
              className="absolute h-full bg-primary"
              style={{
                left: `${minPercent}%`,
                width: `${maxPercent - minPercent}%`,
              }}
            />
          </div>

          {/* Min thumb */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${minPercent}%` }}
          >
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue[0]}
              disabled={disabled}
              onChange={(e) => handleChange(0, Number(e.target.value))}
              className={cn(
                "pointer-events-auto h-5 w-5 appearance-none rounded-full border-2 border-primary",
                "bg-background shadow-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "cursor-pointer"
              )}
              aria-label="Minimum value"
            />
          </div>

          {/* Max thumb */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${maxPercent}%` }}
          >
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue[1]}
              disabled={disabled}
              onChange={(e) => handleChange(1, Number(e.target.value))}
              className={cn(
                "pointer-events-auto h-5 w-5 appearance-none rounded-full border-2 border-primary",
                "bg-background shadow-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "cursor-pointer"
              )}
              aria-label="Maximum value"
            />
          </div>
        </div>

        {/* Value labels */}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(currentValue[0])}</span>
          <span>{formatValue(currentValue[1])}</span>
        </div>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
