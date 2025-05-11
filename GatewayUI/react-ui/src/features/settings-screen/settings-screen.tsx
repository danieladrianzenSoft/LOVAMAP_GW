import { useState } from "react";
import ChangePasswordForm from "../user/change-password";

const SettingsScreen = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-3xl text-gray-700 font-bold mb-6">Account Settings</div>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl">
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

      {showPasswordModal && (
        <ChangePasswordForm onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default SettingsScreen;