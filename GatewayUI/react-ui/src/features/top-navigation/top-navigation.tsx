import React from 'react';
import { useStore } from '../../app/stores/store';
import UserDropdown from './user-dropdown';
import { observer } from 'mobx-react-lite';
import history from "../../app/helpers/History";
import { NavLink } from 'react-router-dom';
import logo from '../../../src/LOVAMAP_logo.png';

interface TopNavigationProps {
	isSidebarOpen: boolean;
	setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ isSidebarOpen, setSidebarOpen }) => {
	const {commonStore} = useStore();
	const isLoggedIn = commonStore.isLoggedIn;

	return (
		<div className="top-navigation">
			{/* Left side: Logo + hamburger */}
			{!isSidebarOpen && (
				<div className="flex items-center space-x-4">
					{/* Hamburger only on mobile */}
					<button
						className="md:hidden focus:outline-none"
						onClick={() => setSidebarOpen(prev => !prev)}
					>
					<svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
					</button>

					{/* Logo */}
					<NavLink to="/" onClick={() => setSidebarOpen(false)}>
						<img className="mx-auto w-32 my-4" src={logo} alt="logo" />
					</NavLink>
				</div>
			)}
			{isSidebarOpen && (
				<div></div>
			)}


			{/* Right side: User/Login */}
			<div className="flex items-center space-x-4">
				{isLoggedIn ? <UserCircle /> : (
				<button onClick={() => history.push('/login')} className='button-primary mr-4'>
					Login
				</button>
				)}
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