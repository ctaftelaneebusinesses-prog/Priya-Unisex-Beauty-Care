import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint } from "@/services/reportService";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";

export function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a15b" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#c9a15b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#ede7dd" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#4d3f32" }}
          axisLine={{ stroke: "#ede7dd" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#4d3f32" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v)}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #ede7dd",
            fontSize: 13,
            boxShadow: "0 8px 24px -8px rgba(20,16,13,0.15)",
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#b3894a"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
