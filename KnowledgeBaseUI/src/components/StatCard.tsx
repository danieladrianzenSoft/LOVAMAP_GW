import React from 'react';

interface StatCardProps {
	label: string;
	value: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
		<p className="text-2xl font-bold text-gray-800 dark:text-white">{value.toLocaleString()}</p>
		<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
	</div>
);

export default StatCard;
