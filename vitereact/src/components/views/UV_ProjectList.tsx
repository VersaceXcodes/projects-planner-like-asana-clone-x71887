import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import axios from 'axios';
import { useAppSelector } from '@/store/main';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const UV_ProjectList: React.FC = () => {
  // global state
  const current_workspace_id = useAppSelector(
    (state) => state.current_workspace_id
  );

  // local state
  const [projects, set_projects] = useState<Project[]>([]);
  const [show_archived, set_show_archived] = useState<boolean>(false);
  const [inline_edit_id, set_inline_edit_id] = useState<string | null>(null);
  const [inline_edit_value, set_inline_edit_value] = useState<string>('');
  const [loading, set_loading] = useState<boolean>(false);

  // fetchProjects
  const fetch_projects = useCallback(async () => {
    if (!current_workspace_id) return;
    set_loading(true);
    try {
      const resp = await axios.get<Project[]>(
        `/api/workspaces/${current_workspace_id}/projects`,
        { params: { include_archived: show_archived } }
      );
      set_projects(resp.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      set_projects([]);
    } finally {
      set_loading(false);
    }
  }, [current_workspace_id, show_archived]);

  useEffect(() => {
    fetch_projects();
  }, [fetch_projects]);

  // start rename
  const start_rename = (proj: Project) => {
    set_inline_edit_id(proj.id);
    set_inline_edit_value(proj.name);
  };

  // renameProject
  const rename_project = async (project_id: string) => {
    try {
      await axios.patch<Project>(`/api/projects/${project_id}`, {
        name: inline_edit_value
      });
      set_inline_edit_id(null);
      set_inline_edit_value('');
      fetch_projects();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  // toggle archive / unarchive
  const toggle_archive_project = async (proj: Project) => {
    try {
      const action = proj.is_archived ? 'unarchive' : 'archive';
      await axios.post<Project>(`/api/projects/${proj.id}/${action}`);
      fetch_projects();
    } catch (err) {
      console.error('Archive toggle failed:', err);
    }
  };

  // deleteProject
  const delete_project = async (proj: Project) => {
    if (!proj.is_archived) {
      window.alert('Please archive a project before deleting it.');
      return;
    }
    const ok = window.confirm(
      `Are you sure you want to permanently delete "${proj.name}"?`
    );
    if (!ok) return;
    try {
      await axios.delete(`/api/projects/${proj.id}`);
      fetch_projects();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // open new project modal via DOM event
  const open_new_project_modal = () => {
    window.dispatchEvent(new CustomEvent('open_modal_new_project'));
  };

  // handle inline edit key
  const on_inline_key = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      rename_project(id);
    }
    if (e.key === 'Escape') {
      set_inline_edit_id(null);
      set_inline_edit_value('');
    }
  };

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button
            onClick={open_new_project_modal}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Project
          </button>
        </div>

        {/* Show Archived Toggle */}
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={show_archived}
              onChange={() => set_show_archived((prev) => !prev)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Show Archived</span>
          </label>
        </div>

        {/* Loading / Empty */}
        {loading ? (
          <div className="text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-gray-500">No projects found.</div>
        ) : (
          <ul>
            {projects.map((proj) => (
              <li
                key={proj.id}
                className={`flex items-center justify-between p-2 mb-1 rounded ${
                  proj.is_archived ? 'opacity-50' : 'hover:bg-gray-100'
                }`}
              >
                {/* Color indicator + name or inline edit */}
                <div className="flex items-center flex-1">
                  <span
                    className="inline-block w-3 h-3 mr-3 rounded"
                    style={{ backgroundColor: proj.color }}
                  />
                  {inline_edit_id === proj.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={inline_edit_value}
                      onChange={(e) =>
                        set_inline_edit_value(e.target.value)
                      }
                      onBlur={() => rename_project(proj.id)}
                      onKeyDown={(e) => on_inline_key(e, proj.id)}
                      className="flex-1 border-b border-blue-600 focus:outline-none"
                    />
                  ) : (
                    <Link
                      to={`/projects/${proj.id}/list`}
                      className="flex-1 text-blue-600 hover:underline"
                    >
                      {proj.name}
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => start_rename(proj)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => toggle_archive_project(proj)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {proj.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => delete_project(proj)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default UV_ProjectList;