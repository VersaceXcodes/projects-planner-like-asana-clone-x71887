import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector, useAppDispatch, set_auth } from '@/store/main';
import type { RootState } from '@/store/main';

const UV_NotificationSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state: RootState) => state.auth.user);
  const token = useAppSelector((state: RootState) => state.auth.token);

  const [notifyInApp, setNotifyInApp] = useState<boolean>(
    () => authUser?.notify_in_app ?? false
  );
  const [notificationSaveStatus, setNotificationSaveStatus] = useState<{
    success: boolean;
    message: string | null;
  }>({ success: false, message: null });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync local toggle with global state when authUser changes
  useEffect(() => {
    if (authUser) {
      setNotifyInApp(authUser.notify_in_app);
    }
  }, [authUser]);

  // Handler: toggle switch
  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifyInApp(e.target.checked);
    setNotificationSaveStatus({ success: false, message: null });
  };

  // Handler: Save settings to backend
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const resp = await axios.patch<RootState['auth']['user']>(
        '/api/users/me',
        { notify_in_app: notifyInApp }
      );
      // Update global auth state with new user object, preserving token
      if (token) {
        dispatch(set_auth({ token, user: resp.data }));
      }
      setNotificationSaveStatus({
        success: true,
        message: 'Notification settings saved successfully.'
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save settings.';
      setNotificationSaveStatus({ success: false, message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-gray-800">
          Notification Settings
        </h1>
        <p className="mt-2 text-gray-600">
          Preferences page for toggling in-app notifications. Contains a master
          toggle for enabling/disabling notifications and a 'Save Settings'
          button.
        </p>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-gray-700 font-medium">
            Enable in-app notifications
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="notifySwitch"
              type="checkbox"
              className="sr-only peer"
              checked={notifyInApp}
              onChange={handleToggleChange}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors duration-200"></div>
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-5"></div>
          </label>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`px-4 py-2 rounded font-semibold text-white transition-colors duration-200 ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {notificationSaveStatus.message && (
          <div className="mt-4">
            <p
              className={`${
                notificationSaveStatus.success
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {notificationSaveStatus.message}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_NotificationSettings;