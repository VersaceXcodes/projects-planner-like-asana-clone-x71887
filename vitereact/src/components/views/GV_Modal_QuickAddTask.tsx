// @/components/views/GV_Modal_QuickAddTask.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '@/store/main';
import { useNavigate } from 'react-router-dom';

const OPEN_EVENT = 'openQuickAddTaskModal';

/**
 * Helper to open the Quick Add Task modal.
 * GV_QuickAddMenu (or any consumer) can import and call this.
 */
export function triggerOpenQuickAddTaskModal() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Project {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

const GV_Modal_QuickAddTask: React.FC = () => {
  const navigate = useNavigate();
  const currentWorkspaceId = useAppSelector(
    (state) => state.current_workspace_id
  );

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [sectionOptions, setSectionOptions] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const [memberOptions, setMemberOptions] = useState<UserOption[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
    'medium'
  );
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    selectedProjectId?: string;
  }>({});

  // Open handler via custom event
  useEffect(() => {
    const handleOpen = () => {
      // reset all fields
      setTitle('');
      setSelectedProjectId(null);
      setSectionOptions([]);
      setSelectedSectionId(null);
      setAssignees([]);
      setDueDate('');
      setPriority('medium');
      setValidationErrors({});
      // fetch projects & members
      fetchProjectOptions();
      fetchMemberOptions();
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpen);
    };
  }, [currentWorkspaceId]);

  // Fetch workspace's projects
  const fetchProjectOptions = async () => {
    if (!currentWorkspaceId) return;
    try {
      const resp = await axios.get<Project[]>(
        `/api/workspaces/${currentWorkspaceId}/projects`
      );
      setProjectOptions(resp.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // Fetch workspace's members for assignee multi-select
  const fetchMemberOptions = async () => {
    if (!currentWorkspaceId) return;
    try {
      const resp = await axios.get<Array<{ user: UserOption }>>(
        `/api/workspaces/${currentWorkspaceId}/members`
      );
      setMemberOptions(resp.data.map((m) => m.user));
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  // When project changes, load its sections
  const onProjectChange = async (projId: string) => {
    setSelectedProjectId(projId);
    setSelectedSectionId(null);
    setSectionOptions([]);
    if (!projId) return;
    try {
      const resp = await axios.get<Section[]>(
        `/api/projects/${projId}/sections`
      );
      setSectionOptions(resp.data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  // Submit new task
  const onCreate = async () => {
    const errors: { title?: string; selectedProjectId?: string } = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    }
    if (!selectedProjectId) {
      errors.selectedProjectId = 'Please select a project';
    }
    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    const payload: any = {
      project_id: selectedProjectId,
      title: title.trim(),
      priority,
      assignees,
      parent_task_id: null
    };
    if (selectedSectionId) {
      payload.section_id = selectedSectionId;
    }
    if (dueDate) {
      payload.due_date = dueDate;
    }
    try {
      const resp = await axios.post('/api/tasks', payload);
      const created = resp.data as { id: string };
      setIsOpen(false);
      navigate(`/tasks/${created.id}`);
    } catch (err) {
      console.error('Error creating task:', err);
      // could set a global error alert here
    }
  };

  // Close modal
  const onCancel = () => {
    setIsOpen(false);
    setValidationErrors({});
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={onCancel}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 z-10">
            <h2 className="text-xl font-semibold mb-4">
              Quick Add Task
            </h2>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`mt-1 block w-full border rounded px-2 py-1 focus:outline-none focus:ring ${
                    validationErrors.title
                      ? 'border-red-500 focus:ring-red-300'
                      : 'border-gray-300 focus:ring-blue-300'
                  }`}
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.title}
                  </p>
                )}
              </div>
              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => onProjectChange(e.target.value)}
                  className={`mt-1 block w-full border rounded px-2 py-1 focus:outline-none focus:ring ${
                    validationErrors.selectedProjectId
                      ? 'border-red-500 focus:ring-red-300'
                      : 'border-gray-300 focus:ring-blue-300'
                  }`}
                >
                  <option value="" disabled>
                    Select a project...
                  </option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {validationErrors.selectedProjectId && (
                  <p className="text-red-500 text-xs mt-1">
                    {validationErrors.selectedProjectId}
                  </p>
                )}
              </div>
              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Section
                </label>
                <select
                  value={selectedSectionId || ''}
                  onChange={(e) =>
                    setSelectedSectionId(e.target.value || null)
                  }
                  disabled={!sectionOptions.length}
                  className="mt-1 block w-full border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-300"
                >
                  <option value="">No section</option>
                  {sectionOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assignees
                </label>
                <div className="mt-1 max-h-32 overflow-auto border rounded p-2">
                  {memberOptions.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center space-x-2 mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={assignees.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignees((prev) => [...prev, u.id]);
                          } else {
                            setAssignees((prev) =>
                              prev.filter((id) => id !== u.id)
                            );
                          }
                        }}
                        className="form-checkbox"
                      />
                      <span className="text-sm">
                        {u.name || u.email}
                      </span>
                    </label>
                  ))}
                  {!memberOptions.length && (
                    <p className="text-gray-500 text-sm">
                      No members to assign.
                    </p>
                  )}
                </div>
              </div>
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-300"
                />
              </div>
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as 'low' | 'medium' | 'high')
                  }
                  className="mt-1 block w-full border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-300"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            {/* Actions */}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_Modal_QuickAddTask;