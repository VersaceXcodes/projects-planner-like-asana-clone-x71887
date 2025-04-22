import React, { useState, useEffect, ChangeEvent } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '@/store/main';
import { io, Socket } from 'socket.io-client';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from 'react-beautiful-dnd';

type ProjectMeta = {
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

type TaskType = {
  id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  assignees: string[];
  due_date: string | null;
  priority: string;
  status: string;
  order: number;
};

type Filters = {
  assignees: string[];
  status: string[];
  priority: string[];
  due_date_from: string | null;
  due_date_to: string | null;
};

type Sort = {
  field: string;
  order: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const UV_ProjectDetailList: React.FC = () => {
  const { project_id: projectId } = useParams<{ project_id: string }>();
  const token = useAppSelector((s) => s.auth.token);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [filters, setFilters] = useState<Filters>({
    assignees: [],
    status: [],
    priority: [],
    due_date_from: null,
    due_date_to: null
  });
  const [sort, setSort] = useState<Sort>({ field: 'order', order: 'asc' });
  const [inlineEditSectionId, setInlineEditSectionId] = useState<string | null>(null);
  const [inlineEditSectionValue, setInlineEditSectionValue] = useState<string>('');
  const [loadingSections, setLoadingSections] = useState<boolean>(false);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});

  // Fetch project metadata
  const fetchProjectMeta = async () => {
    try {
      const resp = await axios.get<ProjectMeta>(`/api/projects/${projectId}`);
      setProjectMeta(resp.data);
    } catch (err) {
      console.error('fetchProjectMeta error', err);
    }
  };

  // Fetch sections
  const fetchSections = async () => {
    setLoadingSections(true);
    try {
      const resp = await axios.get<Section[]>(`/api/projects/${projectId}/sections`);
      const sorted = resp.data.sort((a, b) => a.order - b.order);
      setSections(sorted);
    } catch (err) {
      console.error('fetchSections error', err);
    } finally {
      setLoadingSections(false);
    }
  };

  // Fetch tasks with filters & sort
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const params = new URLSearchParams();
      filters.assignees.forEach(a => params.append('assignee', a));
      filters.status.forEach(s => params.append('status', s));
      filters.priority.forEach(p => params.append('priority', p));
      if (filters.due_date_from) params.append('due_date_from', filters.due_date_from);
      if (filters.due_date_to) params.append('due_date_to', filters.due_date_to);
      if (sort.field !== 'order') {
        params.append('sort_field', sort.field);
        params.append('sort_order', sort.order);
      }
      const resp = await axios.get<TaskType[]>(
        `/api/projects/${projectId}/tasks?${params.toString()}`
      );
      const sorted = resp.data.sort((a, b) => a.order - b.order);
      setTasks(sorted);
    } catch (err) {
      console.error('fetchTasks error', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Rename a section
  const renameSection = async (sectionId: string) => {
    if (!inlineEditSectionValue.trim()) {
      setInlineEditSectionId(null);
      return;
    }
    setLoadingSections(true);
    try {
      await axios.patch<Section>(`/api/sections/${sectionId}`, {
        name: inlineEditSectionValue.trim()
      });
      await fetchSections();
      setInlineEditSectionId(null);
      setInlineEditSectionValue('');
    } catch (err) {
      console.error('renameSection error', err);
    } finally {
      setLoadingSections(false);
    }
  };

  // Delete a section
  const deleteSection = async (sectionId: string) => {
    if (!window.confirm('Delete this section? Tasks will become Unsectioned.')) return;
    setLoadingSections(true);
    try {
      await axios.delete(`/api/sections/${sectionId}`);
      // tasks may have moved to unsectioned
      await Promise.all([fetchSections(), fetchTasks()]);
    } catch (err) {
      console.error('deleteSection error', err);
    } finally {
      setLoadingSections(false);
    }
  };

  // Quick-add a task inline
  const inlineAddTask = async (sectionId: string | null) => {
    const title = newTaskTitles[sectionId ?? 'null']?.trim();
    if (!title) return;
    setLoadingTasks(true);
    try {
      await axios.post<TaskType>('/api/tasks', {
        project_id: projectId,
        section_id: sectionId,
        title
      });
      setNewTaskTitles(prev => ({ ...prev, [sectionId ?? 'null']: '' }));
      await fetchTasks();
    } catch (err) {
      console.error('inlineAddTask error', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Drag & drop handler
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    if (!destination) return;

    // Reorder sections
    if (type === 'SECTION') {
      const newSections = Array.from(sections);
      const [moved] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, moved);
      setSections(newSections);
      try {
        await axios.post<Section[]>(
          `/api/projects/${projectId}/sections/reorder`,
          { sections: newSections.map((s, idx) => ({ id: s.id, order: idx })) }
        );
      } catch (err) {
        console.error('reorderSections API error', err);
      }
      return;
    }

    // Reorder or move a task
    if (type === 'TASK') {
      // map droppableIds "unsectioned" => section_id null
      const srcSectionId = source.droppableId === 'unsectioned' ? null : source.droppableId;
      const dstSectionId = destination.droppableId === 'unsectioned' ? null : destination.droppableId;
      const taskId = draggableId.replace(/^task-/, '');
      // build new local tasks list
      const newTasks = Array.from(tasks);
      const movingTaskIndex = newTasks.findIndex(t => t.id === taskId);
      if (movingTaskIndex < 0) return;
      const [movedTask] = newTasks.splice(movingTaskIndex, 1);
      movedTask.section_id = dstSectionId;
      movedTask.order = destination.index;
      // insert
      newTasks.splice(destination.index, 0, movedTask);
      setTasks(newTasks.sort((a, b) => a.order - b.order));
      // patch moved task
      try {
        await axios.patch<TaskType>(`/api/tasks/${taskId}`, {
          section_id: dstSectionId,
          order: destination.index
        });
      } catch (err) {
        console.error('reorderTasks API error', err);
      }
    }
  };

  // Hook: initial load
  useEffect(() => {
    fetchProjectMeta();
    fetchSections();
    fetchTasks();
  }, [projectId]);

  // Hook: refetch tasks on filter or sort change
  useEffect(() => {
    fetchTasks();
  }, [filters, sort]);

  // Hook: Socket.io realtime updates
  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(API_BASE_URL, { auth: { token } });
    // Section events
    socket.on('section_created', (data: any) => {
      if (data.section.project_id === projectId) {
        setSections(prev => [...prev, data.section].sort((a, b) => a.order - b.order));
      }
    });
    socket.on('section_updated', (data: any) => {
      setSections(prev => prev.map(s => s.id === data.section.id ? data.section : s));
    });
    socket.on('section_deleted', (data: any) => {
      setSections(prev => prev.filter(s => s.id !== data.section_id));
    });
    socket.on('section_reordered', (data: any) => {
      setSections(prev => {
        const map: Record<string, Section> = {};
        prev.forEach(s => map[s.id] = s);
        data.sections.forEach((o: any) => {
          if (map[o.id]) map[o.id].order = o.order;
        });
        return Object.values(map).sort((a, b) => a.order - b.order);
      });
    });
    // Task events
    const updateOrAddTask = (t: TaskType) => {
      setTasks(prev => {
        const idx = prev.findIndex(x => x.id === t.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = t;
          return copy.sort((a, b) => a.order - b.order);
        }
        return [...prev, t].sort((a, b) => a.order - b.order);
      });
    };
    socket.on('task_created', (data: any) => data.task.project_id === projectId && updateOrAddTask(data.task));
    socket.on('task_updated', (data: any) => data.task.project_id === projectId && updateOrAddTask(data.task));
    socket.on('task_moved', (data: any) => data.task.project_id === projectId && updateOrAddTask(data.task));
    socket.on('task_order_changed', (data: any) => data.task.project_id === projectId && updateOrAddTask(data.task));
    socket.on('task_deleted', (data: any) => {
      setTasks(prev => prev.filter(t => t.id !== data.task_id));
    });
    return () => {
      socket.disconnect();
    };
  }, [token, projectId]);

  // Derived: all assignee IDs in current tasks
  const allAssignees = Array.from(new Set(tasks.flatMap(t => t.assignees)));
  const uniqueStatuses = ['in_progress', 'completed'];
  const uniquePriorities = ['low', 'medium', 'high'];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="p-4 bg-white border-b flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-800">{projectMeta?.name}</h2>
            <Link
              to={`/projects/${projectId}/board`}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Board View
            </Link>
          </div>
          <div className="flex flex-wrap items-center space-x-2">
            {/* Assignee filter */}
            <select
              multiple
              value={filters.assignees}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                setFilters(prev => ({ ...prev, assignees: opts }));
              }}
              className="border px-2 py-1 rounded"
            >
              {allAssignees.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            {/* Status filter */}
            <select
              multiple
              value={filters.status}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                setFilters(prev => ({ ...prev, status: opts }));
              }}
              className="border px-2 py-1 rounded"
            >
              {uniqueStatuses.map(st => (
                <option key={st} value={st}>{st.replace('_', ' ')}</option>
              ))}
            </select>
            {/* Priority filter */}
            <select
              multiple
              value={filters.priority}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                setFilters(prev => ({ ...prev, priority: opts }));
              }}
              className="border px-2 py-1 rounded"
            >
              {uniquePriorities.map(pr => (
                <option key={pr} value={pr}>{pr}</option>
              ))}
            </select>
            {/* Due date range */}
            <input
              type="date"
              value={filters.due_date_from || ''}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, due_date_from: e.target.value || null }))
              }
              className="border px-2 py-1 rounded"
            />
            <input
              type="date"
              value={filters.due_date_to || ''}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, due_date_to: e.target.value || null }))
              }
              className="border px-2 py-1 rounded"
            />
            {/* Sort */}
            <select
              value={sort.field}
              onChange={(e) =>
                setSort(prev => ({ ...prev, field: e.target.value }))
              }
              className="border px-2 py-1 rounded"
            >
              <option value="due_date">Due Date</option>
              <option value="created_at">Created At</option>
              <option value="title">Alphabetical</option>
            </select>
            <select
              value={sort.order}
              onChange={(e) =>
                setSort(prev => ({ ...prev, order: e.target.value }))
              }
              className="border px-2 py-1 rounded"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>

        {/* Drag-and-drop context */}
        <div className="flex-1 overflow-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Sections reorder */}
            <Droppable droppableId="sections" type="SECTION">
              {(provided) => (
                <div
                  className="p-4 space-y-6"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {sections.map((section, idx) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={idx}
                    >
                      {(prov) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className="bg-gray-50 p-4 rounded shadow-sm"
                        >
                          {/* Section header */}
                          <div
                            className="flex items-center justify-between mb-2"
                            {...prov.dragHandleProps}
                          >
                            {inlineEditSectionId === section.id ? (
                              <input
                                type="text"
                                value={inlineEditSectionValue}
                                onChange={(e) => setInlineEditSectionValue(e.target.value)}
                                onBlur={() => renameSection(section.id)}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && renameSection(section.id)
                                }
                                className="border px-2 py-1 rounded flex-1"
                                disabled={loadingSections}
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center space-x-2">
                                <h3
                                  className="text-lg font-medium"
                                  style={{ color: projectMeta?.color }}
                                >
                                  {section.name}
                                </h3>
                                <button
                                  onClick={() => {
                                    setInlineEditSectionId(section.id);
                                    setInlineEditSectionValue(section.name);
                                  }}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => deleteSection(section.id)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Tasks droppable */}
                          <Droppable droppableId={section.id} type="TASK">
                            {(provTask) => (
                              <div
                                ref={provTask.innerRef}
                                {...provTask.droppableProps}
                                className="space-y-2 min-h-[40px]"
                              >
                                {tasks
                                  .filter((t) => t.section_id === section.id)
                                  .sort((a, b) => a.order - b.order)
                                  .map((task, tIdx) => (
                                    <Draggable
                                      key={task.id}
                                      draggableId={`task-${task.id}`}
                                      index={tIdx}
                                    >
                                      {(prTask) => (
                                        <div
                                          ref={prTask.innerRef}
                                          {...prTask.draggableProps}
                                          {...prTask.dragHandleProps}
                                          className="flex items-center bg-white p-2 rounded shadow space-x-2"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={task.status === 'completed'}
                                            readOnly
                                            className="form-checkbox"
                                          />
                                          <Link
                                            to={`/tasks/${task.id}`}
                                            className="flex-1 text-left text-gray-800 hover:underline"
                                          >
                                            {task.title}
                                          </Link>
                                          <div className="flex space-x-1">
                                            {task.assignees.map((aid) => (
                                              <img
                                                key={aid}
                                                src={`https://picsum.photos/seed/${aid}/24/24`}
                                                alt="avatar"
                                                className="w-6 h-6 rounded-full"
                                              />
                                            ))}
                                          </div>
                                          <span className="text-sm text-gray-600">
                                            {task.due_date}
                                          </span>
                                          <span className="text-sm text-gray-600">
                                            {task.priority}
                                          </span>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                {provTask.placeholder}
                                <input
                                  type="text"
                                  placeholder="Add task..."
                                  value={newTaskTitles[section.id] || ''}
                                  onChange={(e) =>
                                    setNewTaskTitles((p) => ({
                                      ...p,
                                      [section.id]: e.target.value
                                    }))
                                  }
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && inlineAddTask(section.id)
                                  }
                                  className="mt-2 w-full border px-2 py-1 rounded"
                                  disabled={loadingTasks}
                                />
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}

                  {/* Unsectioned tasks area */}
                  <div className="bg-gray-50 p-4 rounded shadow-sm">
                    <h3 className="text-lg font-medium mb-2">Unsectioned</h3>
                    <Droppable droppableId="unsectioned" type="TASK">
                      {(provU) => (
                        <div
                          ref={provU.innerRef}
                          {...provU.droppableProps}
                          className="space-y-2 min-h-[40px]"
                        >
                          {tasks
                            .filter((t) => t.section_id === null)
                            .sort((a, b) => a.order - b.order)
                            .map((task, tIdx) => (
                              <Draggable
                                key={task.id}
                                draggableId={`task-${task.id}`}
                                index={tIdx}
                              >
                                {(prU) => (
                                  <div
                                    ref={prU.innerRef}
                                    {...prU.draggableProps}
                                    {...prU.dragHandleProps}
                                    className="flex items-center bg-white p-2 rounded shadow space-x-2"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={task.status === 'completed'}
                                      readOnly
                                      className="form-checkbox"
                                    />
                                    <Link
                                      to={`/tasks/${task.id}`}
                                      className="flex-1 text-left text-gray-800 hover:underline"
                                    >
                                      {task.title}
                                    </Link>
                                    <div className="flex space-x-1">
                                      {task.assignees.map((aid) => (
                                        <img
                                          key={aid}
                                          src={`https://picsum.photos/seed/${aid}/24/24`}
                                          alt="avatar"
                                          className="w-6 h-6 rounded-full"
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-600">
                                      {task.due_date}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {task.priority}
                                    </span>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provU.placeholder}
                          <input
                            type="text"
                            placeholder="Add task..."
                            value={newTaskTitles['null'] || ''}
                            onChange={(e) =>
                              setNewTaskTitles((p) => ({
                                ...p,
                                ['null']: e.target.value
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === 'Enter' && inlineAddTask(null)
                            }
                            className="mt-2 w-full border px-2 py-1 rounded"
                            disabled={loadingTasks}
                          />
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </>
  );
};

export default UV_ProjectDetailList;