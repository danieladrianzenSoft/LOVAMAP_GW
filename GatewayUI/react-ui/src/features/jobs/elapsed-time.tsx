import { useEffect, useState } from 'react';

interface Props {
	since: string; // ISO date string
}

const formatElapsed = (ms: number): string => {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${seconds}s`;
};

const ElapsedTime: React.FC<Props> = ({ since }) => {
	const [elapsed, setElapsed] = useState(() =>
		Math.max(0, Date.now() - new Date(since).getTime())
	);

	useEffect(() => {
		const start = new Date(since).getTime();
		const tick = () => setElapsed(Math.max(0, Date.now() - start));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [since]);

	return <span className="tabular-nums">{formatElapsed(elapsed)}</span>;
};

export default ElapsedTime;
