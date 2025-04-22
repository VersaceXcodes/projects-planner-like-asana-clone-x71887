import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '@/store/main';

type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type Section = {
  id: string;
  project_id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at: string;
};
type Task = {
  id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  assignees: string[];
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'in_progress' | 'completed';
  order: number;
};

const UV_ProjectDetailBoard: React.FC = () => {
  const { project_id: projectId } = useParams<{ project_id: string }>();
  const workspaceId = useAppSelector((s) => s.current_workspace_id);
  const [projectMeta, setProjectMeta] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inlineEditSectionId, setInlineEditSectionId] = useState<string | null>(null);
  const [inlineEditSectionValue, setInlineEditSectionValue] = useState('');
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // fetch project meta, sections, tasks
  useEffect(() => {
    if (!projectId) return;

    const fetchProjectMeta = async () => {
      try {
        const resp = await axios.get<Project>(`/api/projects/${projectId}`);
        setProjectMeta(resp.data);
      } catch (err) {
        console.error('fetchProjectMeta error', err);
      }
    };
    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const resp = await axios.get<Section[]>(`/api/projects/${projectId}/sections`);
        // sort by order
        setSections(resp.data.sort((a, b) => a.order - b.order));
      } catch (err) {
        console.error('fetchSections error', err);
      } finally {
        setLoadingSections(false);
      }
    };
    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const resp = await axios.get<Task[]>(`/api/projects/${projectId}/tasks`, {
          params: { sort_field: 'order', sort_order: 'asc' },
        });
        setTasks(resp.data.sort((a, b) => a.order - b.order));
      } catch (err) {
        console.error('fetchTasks error', err);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchProjectMeta();
    fetchSections();
    fetchTasks();
  }, [projectId]);

  // inline rename section
  const handleRenameSection = async (sectionId: string) => {
    if (!inlineEditSectionValue.trim()) {
      setInlineEditSectionId(null);
      return;
    }
    try {
      const resp = await axios.patch<Section>(
        `/api/sections/${sectionId}`,
        { name: inlineEditSectionValue.trim() }
      );
      setSections((secs) =>
        secs.map((s) => (s.id === sectionId ? resp.data : s))
      );
    } catch (err) {
      console.error('renameSection error', err);
    } finally {
      setInlineEditSectionId(null);
      setInlineEditSectionValue('');
    }
  };

  // delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await axios.delete(`/api/sections/${sectionId}`);
      setSections((secs) => secs.filter((s) => s.id !== sectionId));
      // reload tasks in case they moved to unsectioned
      const resp = await axios.get<Task[]>(`/api/projects/${projectId}/tasks`, {
        params: { sort_field: 'order', sort_order: 'asc' },
      });
      setTasks(resp.data);
    } catch (err) {
      console.error('deleteSection error', err);
    }
  };

  // reorder sections (HTML5 DnD)
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    e.dataTransfer.setData('section_id', sectionId);
    setDragSectionId(sectionId);
  };
  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleSectionDrop = async (e: React.DragEvent, dropSectionId: string) => {
    e.preventDefault();
    const srcId = e.dataTransfer.getData('section_id');
    if (srcId && srcId !== dropSectionId) {
      const fromIdx = sections.findIndex((s) => s.id === srcId);
      const toIdx = sections.findIndex((s) => s.id === dropSectionId);
      const newOrderArr = Array.from(sections);
      const [moved] = newOrderArr.splice(fromIdx, 1);
      newOrderArr.splice(toIdx, 0, moved);
      // set new order props
      const reordered = newOrderArr.map((s, idx) => ({ ...s, order: idx + 1 }));
      setSections(reordered);
      try {
        await axios.post<Section[]>(
          `/api/projects/${projectId}/sections/reorder`,
          { sections: reordered.map((s) => ({ id: s.id, order: s.order })) }
        );
      } catch (err) {
        console.error('reorderSections API error', err);
      }
    }
    setDragSectionId(null);
  };

  // inline add task
  const handleAddTask = async (sectionId: string) => {
    const title = (newTaskTitles[sectionId] || '').trim();
    if (!title) return;
    try {
      const resp = await axios.post<Task>('/api/tasks', {
        project_id: projectId,
        section_id: sectionId,
        title,
        priority: 'medium',
        assignees: [],
      });
      setTasks((ts) => [...ts, resp.data]);
      setNewTaskTitles((m) => ({ ...m, [sectionId]: '' }));
    } catch (err) {
      console.error('inlineAddTask error', err);
    }
  };

  // reorder tasks (HTML5 DnD)
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('task_id', taskId);
  };
  const handleTaskDrop = async (e: React.DragEvent, toSectionId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('task_id');
    if (taskId) {
      const tasksInTarget = tasks.filter((t) => t.section_id === toSectionId);
      const newOrder = tasksInTarget.length + 1;
      try {
        const resp = await axios.patch<Task>(`/api/tasks/${taskId}`, {
          section_id: toSectionId,
          order: newOrder,
        });
        setTasks((ts) =>
          ts.map((t) => (t.id === taskId ? resp.data : t))
        );
      } catch (err) {
        console.error('reorderTasks error', err);
      }
    }
  };

  // toggle task status
  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    try {
      const resp = await axios.patch<Task>(`/api/tasks/${task.id}`, {
        status: newStatus,
      });
      setTasks((ts) =>
        ts.map((t) => (t.id === task.id ? resp.data : t))
      );
    } catch (err) {
      console.error('updateTaskStatus error', err);
    }
  };

  const priorityIcon = (p: string) =>
    p === 'high' ? '🔴' : p === 'medium' ? '🟠' : '🟢';

  return (
    <>
      <div className="p-4 h-full flex flex-col">
        {/* Header with toggles */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            {projectMeta?.name || 'Loading...'}
          </h1>
          <div className="space-x-2">
            <Link
              to={`/projects/${projectId}/list`}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              List
            </Link>
            <Link
              to={`/projects/${projectId}/board`}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Board
            </Link>
          </div>
        </div>

        {/* Board columns */}
        <div className="flex-1 overflow-x-auto">
          {loadingSections ? (
            <div>Loading sections...</div>
          ) : (
            <div className="flex space-x-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragOver={handleSectionDragOver}
                  onDrop={(e) => {
                    handleSectionDrop(e, section.id);
                    handleTaskDrop(e, section.id);
                  }}
                  className="bg-white w-64 flex-shrink-0 rounded shadow p-3"
                >
                  {/* Section header */}
                  {inlineEditSectionId === section.id ? (
                    <input
                      className="w-full border rounded p-1 mb-2"
                      value={inlineEditSectionValue}
                      autoFocus
                      onChange={(e) =>
                        setInlineEditSectionValue(e.target.value)
                      }
                      onBlur={() => handleRenameSection(section.id)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        handleRenameSection(section.id)
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-semibold">{section.name}</h2>
                      <div className="space-x-1 text-gray-500">
                        <button
                          onClick={() => {
                            setInlineEditSectionId(section.id);
                            setInlineEditSectionValue(section.name);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {loadingTasks ? (
                    <div>Loading tasks...</div>
                  ) : (
                    <div className="space-y-2 min-h-[50px]">
                      {tasks
                        .filter((t) => t.section_id === section.id)
                        .sort((a, b) => a.order - b.order)
                        .map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) =>
                              handleTaskDragStart(e, task.id)
                            }
                            className="bg-gray-50 p-2 rounded shadow cursor-pointer"
                            onClick={() => {
                              /* Navigate to task detail */
                            }}
                          >
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={() => handleToggleStatus(task)}
                                className="mr-2"
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  {task.title}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 space-x-2">
                                  <span>{priorityIcon(task.priority)}</span>
                                  {task.due_date && <span>{task.due_date}</span>}
                                  <span>
                                    {task.assignees.length > 0
                                      ? `${task.assignees.length} assignee${
                                          task.assignees.length > 1 ? 's' : ''
                                        }`
                                      : 'Unassigned'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Quick-add task */}
                  <div className="mt-3">
                    <input
                      className="w-full border rounded p-1"
                      placeholder="New task..."
                      value={newTaskTitles[section.id] || ''}
                      onChange={(e) =>
                        setNewTaskTitles((m) => ({
                          ...m,
                          [section.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleAddTask(section.id)
                      }
                    />
                    <button
                      className="text-blue-500 text-sm mt-1"
                      onClick={() => handleAddTask(section.id)}
                    >
                      + Add Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProjectDetailBoard;