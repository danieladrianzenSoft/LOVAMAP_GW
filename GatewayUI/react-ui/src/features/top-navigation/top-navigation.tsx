import React from 'react';
import { useStore } from '../../app/stores/store';
import UserDropdown from './user-dropdown';
import { observer } from 'mobx-react-lite';
import history from "../../app/helpers/History";


const TopNavigation = () => {
	const {commonStore} = useStore();
	const isLoggedIn = commonStore.isLoggedIn;

	return (
		<div className="top-navigation">
			{/* <NavTitle title={title}/> */}
			{/* <ThemeIcon /> */}
			{/* <Search />
			{ isLoggedIn && <BellIcon /> } */}
			<div className="flex items-center space-x-4">
			</div>
			<div className="flex items-center space-x-4">
				{isLoggedIn && 	
						<UserCircle />
				}
				{!isLoggedIn && 
					<button onClick={() => history.push('/login')} className='button-primary mr-4'>Login</button>
				}
			</div>

			
		</div>
	)
}

// const ThemeIcon = () => {
// 	const [darkTheme, setDarkTheme] = useDarkMode();
// 	const handleMode = () => setDarkTheme(!darkTheme);
// 	return (
// 	  <span onClick={handleMode}>
// 		{darkTheme ? (
// 		  <FaSun size='24' className='top-navigation-icon' />
// 		) : (
// 		  <FaMoon size='24' className='top-navigation-icon' />
// 		)}
// 	  </span>
// 	);
//   };

// const BellIcon = () => <FaRegBell size='24' className='top-navigation-icon' />;
const UserCircle: React.FC = () => {
	// const showDropdown = useState(false)
	// const {userStore: {isLoggedIn}} = useStore();
	// const handleOnClick = () => {
	// 	if (!isLoggedIn) {
	// 		History.push('/login');
	// 	}
	// }

	return (
		<>
			<UserDropdown/>
			
			{/* </div> */}
			{/* <div>
				<FaUserCircle size='24' className='top-navigation-icon' onClick={handleOnClick}/>
				<UserDropdown />
			</div> */}

		</>

	)
}

export default observer(TopNavigation);