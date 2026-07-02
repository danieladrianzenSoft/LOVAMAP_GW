import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import History from '../../app/helpers/History';
import RunLandingHero from './run-landing-hero';

const JobsMain: React.FC = () => {
	const { userStore } = useStore();
	const isLoggedIn = !!userStore.user;

	const handleCtaClick = () => {
		if (isLoggedIn) {
			History.push('/jobs');
		} else {
			History.push('/login?redirect=%2Fjobs');
		}
	}

	return (
		<div className={`container mx-auto py-8 px-6`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Run LOVAMAP</div>

			<RunLandingHero
				isLoggedIn={isLoggedIn}
				onCtaClick={handleCtaClick}
			/>
		</div>
	);
};

export default observer(JobsMain);
