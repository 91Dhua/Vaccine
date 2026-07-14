import { Tooltip } from "antd";
import { memo, useMemo, type ReactNode } from "react";

type SparklineStats = {
  values: number[];
  total: number;
  average: number;
  max: number;
  min: number;
};

export type SparklineProps = {
  data: number[];
  tooltipStatsData?: number[];
  width?: number;
  height?: number;
  padding?: number;
  color?: string;
  lineWidth?: number;
  className?: string;
  title?: string;
  unit?: string;
  total?: number;
  valueText?: string;
  emptyText?: ReactNode;
  tooltipDelay?: number;
  valueFormatter?: (value: number) => string;
};

function normalizeSparklineData(data: number[]) {
  return data.map((value) => (Number.isFinite(value) ? Math.max(value, 0) : 0));
}

function formatSparklineValue(value: number, unit?: string) {
  const normalized = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${normalized}${unit}` : normalized;
}

function buildSparklinePoints(values: number[], width: number, height: number, padding: number) {
  if (!values.length) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const chartHeight = Math.max(height - padding * 2, 1);
  const range = max - min;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = range === 0 ? height / 2 : padding + ((max - value) / range) * chartHeight;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(" ");
}

function buildSparklineStats(data: number[], total?: number): SparklineStats | null {
  const values = normalizeSparklineData(data);
  if (!values.length) return null;

  const resolvedTotal = total ?? values.reduce((sum, value) => sum + value, 0);
  return {
    values,
    total: resolvedTotal,
    average: resolvedTotal / values.length,
    max: Math.max(...values),
    min: Math.min(...values)
  };
}

function renderSparklineSvg({
  points,
  width,
  height,
  color,
  lineWidth,
  className
}: {
  points: string;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        className="sparkline__line"
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}

export const Sparkline = memo(function Sparkline({
  data,
  tooltipStatsData,
  width = 96,
  height = 24,
  padding = 4,
  color = "#52C41A",
  lineWidth = 2,
  className,
  title = "近30天使用",
  unit,
  total,
  valueText,
  emptyText = "—",
  tooltipDelay = 0.2,
  valueFormatter
}: SparklineProps) {
  const chartStats = useMemo(() => buildSparklineStats(data), [data]);
  const hasTooltipStatsData = Boolean(tooltipStatsData?.length);
  const tooltipStats = useMemo(
    () =>
      buildSparklineStats(
        hasTooltipStatsData ? tooltipStatsData || [] : data,
        hasTooltipStatsData ? total : undefined
      ),
    [data, hasTooltipStatsData, tooltipStatsData, total]
  );
  const formatter = valueFormatter ?? ((value: number) => formatSparklineValue(value, unit));

  if (!chartStats || !tooltipStats) {
    return <span className={`sparkline sparkline--empty${className ? ` ${className}` : ""}`}>{emptyText}</span>;
  }

  const points = buildSparklinePoints(chartStats.values, width, height, padding);
  const tooltipPoints = buildSparklinePoints(chartStats.values, 220, 64, 8);
  const resolvedValueText = valueText ?? formatter(tooltipStats.total);

  const content = (
    <div className="sparkline-tooltip">
      <strong>{title}</strong>
      <div className="sparkline-tooltip__chart">
        {renderSparklineSvg({
          points: tooltipPoints,
          width: 220,
          height: 64,
          color,
          lineWidth: 2.2,
          className: "sparkline-tooltip__svg"
        })}
      </div>
      <div className="sparkline-tooltip__rows">
        <span>累计：{resolvedValueText}</span>
        <span>平均：{formatter(tooltipStats.average)}/天</span>
        <span>最高单日：{formatter(tooltipStats.max)}</span>
        <span>最低单日：{formatter(tooltipStats.min)}</span>
      </div>
    </div>
  );

  return (
    <Tooltip
      title={content}
      mouseEnterDelay={tooltipDelay}
      overlayClassName="sparkline-tooltip-popover"
      placement="topLeft"
    >
      <span className={`sparkline${className ? ` ${className}` : ""}`}>
        {renderSparklineSvg({
          points,
          width,
          height,
          color,
          lineWidth,
          className: "sparkline__svg"
        })}
      </span>
    </Tooltip>
  );
});
