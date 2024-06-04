import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { observer } from 'mobx-react-lite'
import { Fragment } from 'react'
import { FaUserCircle } from 'react-icons/fa'
import History from '../../app/helpers/History'
import { useStore } from '../../app/stores/store'

const UserDropdown = () => {
	const {userStore: {isLoggedIn, logout}} = useStore();
  return (
	<>
		<Menu >
		<MenuButton className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
				<FaUserCircle size='24' className='top-navigation-icon' />
				{/* <ChevronDownIcon
				className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
				aria-hidden="true" /> */}
			{/* <div className='mt'></div> */}
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
		{isLoggedIn ? 
			<MenuItems className="absolute right-0 mt-20 w-40 origin-top-right divide-y dropdown-menu">
				{/* <div className="px-1 py-1 ">
					<Menu.Item>
					{({ active }) => (
						<button
							className="dropdown-menu-item group"
						>
						Profile
						</button>
					)}
					</Menu.Item>
					<Menu.Item>
					{({ active }) => (
						<button
						className="dropdown-menu-item group"
						>
						Settings
						</button>
					)}
					</Menu.Item>
				</div> */}
				<div className="px-1 py-1">
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
				</div>
			</MenuItems>
		:
		<MenuItems className="absolute right-0 mt-32 w-40 origin-top-right divide-y dropdown-menu">
				<div className="px-1 py-1 ">
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
					{/* <Menu.Item>
					{({ active }) => (
						<button
						className="dropdown-menu-item group"
						>
						Register
						</button>
					)}
					</Menu.Item> */}
				</div>
			</MenuItems>
		}
		</Transition>

      </Menu>
	</>

  )
}

export default observer(UserDropdown)