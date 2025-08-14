"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const aiProbability = data.probability_ai;

  let riskLevel = "Low Risk";
  let colorClass = "text-green-400";
  if (aiProbability >= 70) {
    riskLevel = "High Risk";
    colorClass = "text-red-400";
  } else if (aiProbability >= 30) {
    riskLevel = "Medium Risk";
    colorClass = "text-yellow-400";
  }

  const minutes = Math.floor(label / 60);
  const seconds = label % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-700">
      <p className="text-white text-sm mb-1">Time: {formattedTime}</p>
      <p className="text-white text-sm mb-1">
        AI Probability: {aiProbability.toFixed(1)}%
      </p>
      <p className={`text-sm font-bold ${colorClass}`}>{riskLevel}</p>
    </div>
  );
};

export default function TimelineChart({ chartData, formatXAxis }) {
  return (
    <div className="w-full h-[200px] md:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          legend={false}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestamp"
            stroke="#fff"
            tick={{ fill: "#fff", fontSize: 8 }}
            tickFormatter={formatXAxis}
          />
          <YAxis
            stroke="#fff"
            tick={{ fill: "#fff", fontSize: 8 }}
            domain={[0, 100]}
            width={25}
          />
          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="#eab308" strokeDasharray="3 3" />

          <Line
            type="monotone"
            dataKey="probability_ai"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#fff" }}
            connectNulls={false}
            name=""
            segments={[
              { value: [0, 30], stroke: "#22c55e" },
              { value: [30, 70], stroke: "#eab308" },
              { value: [70, 100], stroke: "#ef4444" },
            ]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
