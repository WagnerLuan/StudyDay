
import * as React from 'react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => {
  return (
    <Card>
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </Card>
  );
};

export default StatCard;
