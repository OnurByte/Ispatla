"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AccountAnalyticsChart({ data }: { data: Array<{ label: string; views: number; engagements: number; posts: number }> }) {
  if (!data.length) return <p className="py-12 text-center text-sm text-muted-foreground">Seçilen dönemde snapshot yok.</p>;
  return <div className="h-64 w-full" aria-label="Günlük public performans grafiği">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis yAxisId="views" tickLine={false} axisLine={false} fontSize={12} width={48} />
      <YAxis yAxisId="engagements" orientation="right" tickLine={false} axisLine={false} fontSize={12} width={38} />
      <Tooltip formatter={(value, name) => [Number(value || 0).toLocaleString("tr-TR"), name === "views" ? "Görüntülenme" : "Etkileşim"]} />
      <Line yAxisId="views" type="monotone" dataKey="views" name="views" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
      <Line yAxisId="engagements" type="monotone" dataKey="engagements" name="engagements" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
    </LineChart></ResponsiveContainer>
  </div>;
}
