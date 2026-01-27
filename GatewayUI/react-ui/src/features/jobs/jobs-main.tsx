import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../app/stores/store';
import History from '../../app/helpers/History';
import JobNonAdminNotice from './job-non-admin-notice';

const JobsMain: React.FC = () => {
	const { userStore } = useStore();
	const isLoggedIn = !!userStore.user;
	const isUserAdmin = isLoggedIn && (userStore.user?.roles?.includes("administrator") ?? false);

	const handleOnRunOnlineClick = () => {
		if (!isUserAdmin) return;
		History.push('/jobs')
	}

	return (
		<div className={`container mx-auto py-8 px-2`}>
			<div className="text-3xl text-gray-700 font-bold mb-12">Run LOVAMAP</div>

			{/* Always visible (public content) */}
			<JobNonAdminNotice
				isLoggedIn={isLoggedIn}
				isAdmin={isUserAdmin}
				onRunOnlineClick={handleOnRunOnlineClick}
			/>
		</div>
	);
};

export default observer(JobsMain);