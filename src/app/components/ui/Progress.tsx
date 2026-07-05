interface ProgressProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

export function Progress({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  color = 'blue',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  const sizeStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-gray-700 font-medium">{label}</span>}
          {showPercentage && <span className="text-gray-600">{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${colorStyles[color]} ${sizeStyles[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// شريط تقدم متعدد الألوان
interface MultiProgressProps {
  segments: Array<{
    value: number;
    label: string;
    color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  }>;
  total?: number;
  showLegend?: boolean;
}

export function MultiProgress({ segments, total, showLegend = true }: MultiProgressProps) {
  const totalValue = total || segments.reduce((sum, seg) => sum + seg.value, 0);

  const colorStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  const colorLegendStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full overflow-hidden h-3 flex">
        {segments.map((segment, index) => {
          const percentage = (segment.value / totalValue) * 100;
          return (
            <div
              key={index}
              className={`${colorStyles[segment.color]} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
              title={`${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-3">
          {segments.map((segment, index) => {
            const percentage = (segment.value / totalValue) * 100;
            return (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colorLegendStyles[segment.color]}`} />
                <span className="text-sm text-gray-700">
                  {segment.label}: {segment.value} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
