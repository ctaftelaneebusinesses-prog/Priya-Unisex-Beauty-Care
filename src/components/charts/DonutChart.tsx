import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutDatum {
  name: string;
  value: number;
}

const PALETTE = ["#14100d", "#c9a15b", "#7a2540", "#5c7a63", "#93703c"];

export function DonutChart({
  data,
  valueFormatter,
  height = 220,
}: {
  data: DonutDatum[];
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="90%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(Number(value)) : value, ""]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #ede7dd",
            fontSize: 13,
            boxShadow: "0 8px 24px -8px rgba(20,16,13,0.15)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DonutLegend({ data, valueFormatter }: { data: DonutDatum[]; valueFormatter?: (v: number) => string }) {
  return (
    <div className="flex flex-col gap-2">
      {data.map((entry, index) => (
        <div key={entry.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
            />
            <span className="text-ink-700">{entry.name}</span>
          </div>
          <span className="font-semibold text-ink-950">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
