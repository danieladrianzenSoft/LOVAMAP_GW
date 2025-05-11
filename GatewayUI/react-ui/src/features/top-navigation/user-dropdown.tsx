import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { observer } from 'mobx-react-lite'
import { Fragment } from 'react'
import { FaUserCircle } from 'react-icons/fa'
import History from '../../app/helpers/History'
import { useStore } from '../../app/stores/store'

const UserDropdown = () => {
	const {userStore: {isLoggedIn, logout}} = useStore();
  
	return (
		<div className="relative">
			<Menu>
				<MenuButton className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
					<FaUserCircle size='24' className='top-navigation-icon' />
				</MenuButton>
				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					{isLoggedIn ? (
					<MenuItems className="dropdown-menu fixed-dropdown">
						<MenuItem>
						{({ active }) => (
							<button
								className="dropdown-menu-item group"
								onClick={() => History.push("/settings")}
							>
							Settings
							</button>
						)}
						</MenuItem>
						<MenuItem>
						{({ active }) => (
							<button
								className="dropdown-menu-item group"
								onClick={logout}
							>
							Logout
							</button>
						)}
						</MenuItem>
					</MenuItems>
					) : (
					<MenuItems className="dropdown-menu fixed-dropdown">
						<MenuItem>
						{({ active }) => (
							<button
								className="dropdown-menu-item group"
								onClick={() => History.push("/login")}
							>
							Login
							</button>
						)}
						</MenuItem>
					</MenuItems>
					)}
				</Transition>
			</Menu>
		</div>
	);
}

export default observer(UserDropdown)