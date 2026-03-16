import { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ChangePasswordForm from "../user/change-password";

const SettingsScreen = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { commonStore } = useStore();

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-3xl text-gray-700 font-bold mb-6">Account Settings</div>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Security</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manage your password and login settings.
        </p>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="button-outline"
        >
          Change Password
        </button>
      </div>

      {/* UNCOMMENT THIS ONCE WE HAVE DARK MODE FULLY SET UP */}
      {/* <div className="bg-white rounded-xl shadow p-6 max-w-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Appearance</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose between light and dark mode.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => commonStore.toggleDarkMode()}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              commonStore.darkMode ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                commonStore.darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-700">
            {commonStore.darkMode ? 'Dark mode' : 'Light mode'}
          </span>
        </div>
      </div> */}

      {showPasswordModal && (
        <ChangePasswordForm onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default observer(SettingsScreen);
