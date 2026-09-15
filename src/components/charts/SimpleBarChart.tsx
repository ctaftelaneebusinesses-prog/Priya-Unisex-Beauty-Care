import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SimpleBarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  labelKey: string;
  color?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
  layout?: "horizontal" | "vertical";
}

export function SimpleBarChart({
  data,
  dataKey,
  labelKey,
  color = "#4d3f32",
  valueFormatter,
  height = 260,
  layout = "horizontal",
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, left: isVertical ? 8 : -12, bottom: 0 }}
      >
        <CartesianGrid stroke="#ede7dd" horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: "#4d3f32" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
            />
            <YAxis
              type="category"
              dataKey={labelKey}
              tick={{ fontSize: 12, fill: "#211c18" }}
              axisLine={false}
              tickLine={false}
              width={130}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={labelKey}
              tick={{ fontSize: 12, fill: "#4d3f32" }}
              axisLine={{ stroke: "#ede7dd" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#4d3f32" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={valueFormatter}
              width={56}
            />
          </>
        )}
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, ""]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #ede7dd",
            fontSize: 13,
            boxShadow: "0 8px 24px -8px rgba(20,16,13,0.15)",
          }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 6, 6]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
