"use client";

import type { ReactElement, ReactNode } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { chartColors } from "@/constants/design-tokens";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: ReactNode;
  className?: string;
  height?: number;
}

export function ChartContainer({
  children,
  className,
  height = 300,
}: ChartContainerProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-navy-500">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-medium text-navy-950"
          style={{ color: entry.color }}
        >
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

interface PerformanceChartProps {
  data: Array<{ date: string; value: number }>;
  dataKey?: string;
  type?: "line" | "area" | "bar";
  color?: string;
  height?: number;
}

export function PerformanceChart({
  data,
  dataKey = "value",
  type = "area",
  color = chartColors.primary,
  height = 300,
}: PerformanceChartProps) {
  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 10, bottom: 5 },
  };

  const axisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 12, fill: chartColors.muted },
  };

  return (
    <ChartContainer height={height}>
      {type === "line" ? (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      ) : type === "bar" ? (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill="url(#chartGradient)"
          />
        </AreaChart>
      )}
    </ChartContainer>
  );
}

export { chartColors };
