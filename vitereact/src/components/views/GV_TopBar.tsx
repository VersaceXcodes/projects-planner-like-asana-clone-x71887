import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/main';
import {
  set_search_query,
  fetch_search_suggestions,
  clear_search_suggestions
} from '@/store/main';

const GV_TopBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const query = useAppSelector((state) => state.search.query);
  const loading = useAppSelector((state) => state.search.loading);
  const user = useAppSelector((state) => state.auth.user);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // update Redux query
    dispatch(set_search_query(value));

    // clear existing timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      // no query → clear suggestions immediately
      dispatch(clear_search_suggestions());
      return;
    }

    // debounce fetch
    debounceRef.current = setTimeout(() => {
      dispatch(fetch_search_suggestions(value));
    }, 300);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      dispatch(clear_search_suggestions());
      e.currentTarget.blur();
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    dispatch(clear_search_suggestions());
  };

  // Fallback avatar if none
  const avatarUrl =
    user?.avatar_url ||
    'https://picsum.photos/seed/default_avatar/40/40';

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-20">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Search input */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={query}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Search projects, tasks…"
              className={
                `w-full pl-3 pr-10 py-2 border rounded-md text-gray-700 ` +
                `focus:outline-none focus:ring-2 focus:ring-blue-500 ` +
                `${isSearchFocused ? 'ring ring-blue-300' : 'border-gray-300'}`
              }
            />
            {loading && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                Loading…
              </span>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Avatar icon linking to profile settings */}
          <Link to="/profile-settings">
            <img
              src={avatarUrl}
              alt={user?.name || 'User Avatar'}
              className="w-8 h-8 rounded-full cursor-pointer border border-gray-300"
            />
          </Link>
        </div>
      </div>
      {/* push content down so it’s not hidden under fixed TopBar */}
      <div className="h-16" />
    </>
  );
};

export default GV_TopBar;