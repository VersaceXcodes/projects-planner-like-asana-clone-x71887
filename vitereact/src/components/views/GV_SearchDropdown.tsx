import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useAppSelector,
  useAppDispatch,
  clear_search_suggestions
} from '@/store/main';

const GV_SearchDropdown: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Global state
  const query = useAppSelector((s) => s.search.query);
  const suggestions = useAppSelector((s) => s.search.suggestions);
  const loading = useAppSelector((s) => s.search.loading);

  // Local state
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flatten projects and tasks into one list for keyboard nav
  type Item =
    | { type: 'project'; id: string; name: string; color: string }
    | { type: 'task'; id: string; title: string; project_id: string };

  const items: Item[] = [
    ...suggestions.projects.map((p) => ({
      type: 'project' as const,
      id: p.id,
      name: p.name,
      color: p.color
    })),
    ...suggestions.tasks.map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      project_id: t.project_id
    }))
  ];

  const open = query.trim().length > 0 && (loading || items.length > 0);

  // Keyboard navigation & selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((hi) => (hi + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((hi) => (hi - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = items[highlightedIndex];
        if (sel) {
          dispatch(clear_search_suggestions());
          if (sel.type === 'project') {
            navigate(`/projects/${sel.id}/list`);
          } else {
            navigate(`/tasks/${sel.id}`);
          }
        }
      } else if (e.key === 'Escape') {
        dispatch(clear_search_suggestions());
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, highlightedIndex, items, dispatch, navigate]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        dispatch(clear_search_suggestions());
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dispatch]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        ref={dropdownRef}
        className="absolute left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-50 max-h-80 overflow-y-auto"
      >
        {loading && (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        )}

        {!loading && (
          <>
            {suggestions.projects.length > 0 && (
              <div className="py-2">
                <div className="px-4 text-xs font-semibold text-gray-500 uppercase">
                  Projects
                </div>
                {suggestions.projects.map((p, idx) => {
                  const isHighlighted = highlightedIndex === idx;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}/list`}
                      className={`flex items-center px-4 py-2 text-sm ${
                        isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'
                      } text-gray-800`}
                      onClick={() => dispatch(clear_search_suggestions())}
                    >
                      <span
                        className="inline-block w-2 h-2 mr-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {suggestions.tasks.length > 0 && (
              <div className="py-2">
                <div className="px-4 text-xs font-semibold text-gray-500 uppercase">
                  Tasks
                </div>
                {suggestions.tasks.map((t, idx) => {
                  const globalIdx = suggestions.projects.length + idx;
                  const isHighlighted = highlightedIndex === globalIdx;
                  return (
                    <Link
                      key={t.id}
                      to={`/tasks/${t.id}`}
                      className={`flex flex-col px-4 py-2 text-sm ${
                        isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'
                      } text-gray-800`}
                      onClick={() => dispatch(clear_search_suggestions())}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-xs text-gray-500">
                        Project: {t.project_id}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-200">
              <div
                className="px-4 py-2 text-sm text-center text-blue-600 hover:bg-blue-50 cursor-pointer"
                onClick={() => {
                  dispatch(clear_search_suggestions());
                  navigate(`/search?query=${encodeURIComponent(query)}`);
                }}
              >
                View All Results
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default GV_SearchDropdown;