import React, { useState, useRef, useEffect } from 'react';

const GV_QuickAddMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle the quick‑add menu
  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Dispatch event to open Quick‑Add Task modal
  const openNewTaskModal = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('openModalQuickAddTask'));
  };

  // Dispatch event to open New Project modal
  const openNewProjectModal = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('openModalNewProject'));
  };

  return (
    <>
      <div ref={menuRef} className="fixed bottom-4 left-4">
        <button
          type="button"
          onClick={toggleMenu}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Quick add"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
          </svg>
        </button>

        {isOpen && (
          <div className="mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <button
              type="button"
              onClick={openNewTaskModal}
              className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
              </svg>
              <span>New Task</span>
            </button>

            <button
              type="button"
              onClick={openNewProjectModal}
              className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v2H3V7zM3 11h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z"
                />
              </svg>
              <span>New Project</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default GV_QuickAddMenu;