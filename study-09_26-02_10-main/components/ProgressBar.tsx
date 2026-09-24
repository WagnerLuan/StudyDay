
import * as React from 'react';

interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div
        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${clampedPercentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
