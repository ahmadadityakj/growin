"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#9333ea", "#64748b"];

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? <EmptyState title="Belum ada data" /> : <div className="h-64">{children}</div>}
      </CardContent>
    </Card>
  );
}

export function ReportsCharts({
  statusData,
  campaignData,
  channelData,
  msgStatusData,
  monthData,
}: {
  statusData: { name: string; value: number }[];
  campaignData: { name: string; leads: number }[];
  channelData: { name: string; sent: number; replied: number; failed: number }[];
  msgStatusData: { name: string; value: number }[];
  monthData: { month: string; count: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Leads per Bulan" empty={!monthData.length}>
        <ResponsiveContainer>
          <LineChart data={monthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} name="Leads" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Leads per Status" empty={!statusData.length}>
        <ResponsiveContainer>
          <BarChart data={statusData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} fontSize={12} />
            <YAxis type="category" dataKey="name" width={110} fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Leads per Kampanye" empty={!campaignData.length}>
        <ResponsiveContainer>
          <BarChart data={campaignData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="leads" fill="#16a34a" name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Performa Channel" empty={!channelData.length}>
        <ResponsiveContainer>
          <BarChart data={channelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sent" fill="#2563eb" name="Terkirim" />
            <Bar dataKey="replied" fill="#16a34a" name="Dibalas" />
            <Bar dataKey="failed" fill="#dc2626" name="Gagal" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Status Semua Pesan" empty={!msgStatusData.length}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={msgStatusData} dataKey="value" nameKey="name" outerRadius={90} label>
              {msgStatusData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
