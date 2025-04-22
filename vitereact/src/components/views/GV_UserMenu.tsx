import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch, logout } from '@/store/main';

const GV_UserMenu: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape and return focus to button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        const btn = document.getElementById('user-menu-button');
        btn?.focus();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus first menu item on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      }, 0);
    }
  }, [isOpen]);

  if (!user) return null;

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleLogout = () => {
    dispatch(logout());
  };

  // Fallback avatar if none provided
  const avatarSrc = user.avatar_url
    ? user.avatar_url
    : `https://picsum.photos/seed/${user.id}/32/32`;

  return (
    <>
      <div ref={menuRef} className="fixed top-4 right-4 z-50 text-right">
        <button
          id="user-menu-button"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={handleToggle}
          className="focus:outline-none"
        >
          <img
            src={avatarSrc}
            alt={`${user.name} avatar`}
            className="w-8 h-8 rounded-full"
          />
        </button>

        {isOpen && (
          <div
            id="user-menu"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <ul className="py-1" role="none">
              <li role="none">
                <Link
                  to="/profile-settings"
                  role="menuitem"
                  tabIndex={0}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile Settings
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/account-settings"
                  role="menuitem"
                  tabIndex={0}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Account Settings
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/notification-settings"
                  role="menuitem"
                  tabIndex={0}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Notification Settings
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/workspace-settings"
                  role="menuitem"
                  tabIndex={0}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Workspace Settings
                </Link>
              </li>
              <li role="none">
                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  tabIndex={0}
                  className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Log Out
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default GV_UserMenu;