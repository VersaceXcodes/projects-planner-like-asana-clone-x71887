import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppSelector, useAppDispatch, set_auth } from '@/store/main';

const UV_UserProfileSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    displayName: string | null;
    avatar: string | null;
  }>({ displayName: null, avatar: null });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // initializeForm: populate from global auth.user
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  // Update displayName and clear its error
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    if (validationErrors.displayName) {
      setValidationErrors((prev) => ({ ...prev, displayName: null }));
    }
  };

  // Process avatar file selection: validate & preview
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setValidationErrors((prev) => ({
        ...prev,
        avatar: 'Invalid file type. Only JPG and PNG are allowed.'
      }));
      return;
    }
    // Validate size (<2MB)
    if (file.size > 2 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        avatar: 'File size exceeds 2MB limit.'
      }));
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setPreviewUrl(url);
    setAvatarUrl(null);
    setValidationErrors((prev) => ({ ...prev, avatar: null }));
  };

  // Remove existing or selected avatar
  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
    setAvatarUrl(null);
    setValidationErrors((prev) => ({ ...prev, avatar: null }));
  };

  // Submit updated displayName and avatar
  const handleSaveChanges = async () => {
    let hasError = false;
    if (!displayName.trim()) {
      setValidationErrors((prev) => ({
        ...prev,
        displayName: 'Display name cannot be empty.'
      }));
      hasError = true;
    }
    if (validationErrors.avatar) {
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      // 1. Upload new avatar if selected
      let uploadedUrl = avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadResp = await axios.post<{ url: string }>('/storage', formData);
        uploadedUrl = uploadResp.data.url;
      }
      // 2. PATCH user profile
      const updatePayload: { name: string; avatar_url: string | null } = {
        name: displayName,
        avatar_url: uploadedUrl === undefined ? null : uploadedUrl
      };
      const resp = await axios.patch<{
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        notify_in_app: boolean;
        created_at: string;
        updated_at: string;
      }>('/api/users/me', updatePayload);

      // 3. Update global auth state
      if (token) {
        dispatch(set_auth({ token, user: resp.data }));
      }
    } catch (err) {
      console.error('Save Profile Error:', err);
      setValidationErrors((prev) => ({
        ...prev,
        avatar: 'Failed to save changes. Please try again.'
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">User Profile Settings</h1>

        {/* Display Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={handleDisplayNameChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {validationErrors.displayName && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.displayName}
            </p>
          )}
        </div>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <div className="flex items-center mb-2">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar Preview"
                className="w-24 h-24 rounded-full object-cover mr-4"
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Current Avatar"
                className="w-24 h-24 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full mr-4" />
            )}
            {(previewUrl || avatarUrl) && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="text-red-500 text-sm"
              >
                Remove Avatar
              </button>
            )}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleAvatarSelect}
          />
          <p className="text-gray-600 text-xs mt-1">
            Accepted file types: JPG, PNG. Max size: 2MB.
          </p>
          {validationErrors.avatar && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.avatar}
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </>
  );
};

export default UV_UserProfileSettings;