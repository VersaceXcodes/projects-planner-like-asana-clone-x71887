import React, {
  useState,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
  DragEvent,
  FormEvent
} from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/main';

type Subtask = {
  id: string;
  title: string;
  status: 'in_progress' | 'completed';
};
type Comment = {
  id: string;
  author_id: string;
  author_name?: string;
  author_avatar_url?: string | null;
  content: string;
  created_at: string;
};
type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
};
type TaskDetail = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assignees: string[];
  subtasks: Subtask[];
  comments: Comment[];
  attachments: Attachment[];
  activity_logs: { id: string; action: string; timestamp: string }[];
};
type EditBuffer = {
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'in_progress' | 'completed';
  assignees: string[];
};

const UV_TaskDetailPane: React.FC = () => {
  const { task_id: taskId } = useParams<{ task_id: string }>();
  const navigate = useNavigate();
  const currentWorkspaceId = useAppSelector(
    (state) => state.current_workspace_id
  );

  const [taskDetail, setTaskDetail] = useState<TaskDetail>({
    id: '',
    project_id: '',
    section_id: null,
    parent_task_id: null,
    title: '',
    description: null,
    status: 'in_progress',
    priority: 'medium',
    due_date: null,
    assignees: [],
    subtasks: [],
    comments: [],
    attachments: [],
    activity_logs: []
  });
  const [editBuffer, setEditBuffer] = useState<EditBuffer>({
    title: '',
    description: null,
    due_date: null,
    priority: 'medium',
    status: 'in_progress',
    assignees: []
  });
  const [members, setMembers] = useState<
    Array<{ id: string; name: string; avatar_url: string | null }>
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch task + related when mounting or taskId changes
  useEffect(() => {
    if (!taskId) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        // Core task
        const { data: task } = await axios.get<Partial<TaskDetail>>(
          `/api/tasks/${taskId}`
        );
        // Subtasks
        const { data: sub } = await axios.get<Subtask[]>(
          `/api/tasks/${taskId}/subtasks`
        );
        // Comments
        const { data: comm } = await axios.get<Comment[]>(
          `/api/tasks/${taskId}/comments`
        );
        // Attachments
        const { data: atts } = await axios.get<Attachment[]>(
          `/api/tasks/${taskId}/attachments`
        );
        const full: TaskDetail = {
          id: task.id!,
          project_id: task.project_id!,
          section_id: task.section_id ?? null,
          parent_task_id: task.parent_task_id ?? null,
          title: task.title || '',
          description: task.description ?? null,
          status: (task.status as any) || 'in_progress',
          priority: (task.priority as any) || 'medium',
          due_date: task.due_date ?? null,
          assignees: task.assignees || [],
          subtasks: sub.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status
          })),
          comments: comm.map((c) => ({
            id: c.id,
            author_id: c.author_id,
            author_name: c.author_name,
            author_avatar_url: (c as any).author_avatar_url ?? null,
            content: c.content,
            created_at: c.created_at
          })),
          attachments: atts.map((a) => ({
            id: a.id,
            file_name: a.file_name,
            file_url: a.file_url
          })),
          activity_logs: []
        };
        setTaskDetail(full);
        setEditBuffer({
          title: full.title,
          description: full.description,
          due_date: full.due_date,
          priority: full.priority,
          status: full.status,
          assignees: full.assignees
        });
      } catch (err) {
        console.error('fetchTaskDetail error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [taskId]);

  // Fetch workspace members for assignee options
  useEffect(() => {
    if (!currentWorkspaceId) return;
    const fetchMembers = async () => {
      try {
        const { data } = await axios.get<
          Array<{ id: string; user: { id: string; name: string; avatar_url: string | null } }>
        >(`/api/workspaces/${currentWorkspaceId}/members`);
        setMembers(
          data.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            avatar_url: m.user.avatar_url
          }))
        );
      } catch (err) {
        console.error('fetchMembers error', err);
      }
    };
    fetchMembers();
  }, [currentWorkspaceId]);

  const saveField = async (field: keyof EditBuffer, value: any) => {
    if (!taskId) return;
    try {
      await axios.patch(`/api/tasks/${taskId}`, { [field]: value });
      setTaskDetail((prev) => ({
        ...prev,
        [field]: value
      } as any));
    } catch (err) {
      console.error('saveField error', err);
    }
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setEditBuffer((b) => ({ ...b, title: e.target.value }));
  const handleTitleBlur = () => saveField('title', editBuffer.title);

  const handleDescriptionChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ) => setEditBuffer((b) => ({ ...b, description: e.target.value }));
  const handleDescriptionBlur = () =>
    saveField('description', editBuffer.description);

  const handleDueDateChange = (e: ChangeEvent<HTMLInputElement>) =>
    setEditBuffer((b) => ({
      ...b,
      due_date: e.target.value || null
    }));
  const handleDueDateBlur = () => saveField('due_date', editBuffer.due_date);

  const handlePriorityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as 'low' | 'medium' | 'high';
    setEditBuffer((b) => ({ ...b, priority: v }));
    saveField('priority', v);
  };

  const handleStatusToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.checked ? 'completed' : 'in_progress';
    setEditBuffer((b) => ({ ...b, status: newStatus }));
    saveField('status', newStatus);
  };

  const handleAssigneesChange = async (
    e: ChangeEvent<HTMLSelectElement>
  ) => {
    if (!taskId) return;
    const opts = Array.from(e.target.options);
    const selected = opts.filter((o) => o.selected).map((o) => o.value);
    const old = editBuffer.assignees;
    const toAdd = selected.filter((id) => !old.includes(id));
    const toRemove = old.filter((id) => !selected.includes(id));
    try {
      for (const uid of toAdd) {
        await axios.post(`/api/tasks/${taskId}/assignments`, {
          user_id: uid
        });
      }
      for (const uid of toRemove) {
        await axios.delete(
          `/api/tasks/${taskId}/assignments/${uid}`
        );
      }
      setEditBuffer((b) => ({ ...b, assignees: selected }));
      setTaskDetail((t) => ({ ...t, assignees: selected }));
    } catch (err) {
      console.error('handleAssigneesChange error', err);
    }
  };

  const handleNewSubtaskKey = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newSubtaskTitle.trim() || !taskDetail.project_id)
      return;
    try {
      const { data: s } = await axios.post<TaskDetail>(`/api/tasks`, {
        project_id: taskDetail.project_id,
        parent_task_id: taskId,
        title: newSubtaskTitle
      });
      const added: Subtask = {
        id: s.id,
        title: s.title,
        status: s.status
      };
      setTaskDetail((t) => ({
        ...t,
        subtasks: [...t.subtasks, added]
      }));
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('addSubtask error', err);
    }
  };

  const handleToggleSubtask = async (
    sub: Subtask,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const newStatus = e.target.checked ? 'completed' : 'in_progress';
    try {
      await axios.patch(`/api/tasks/${sub.id}`, { status: newStatus });
      setTaskDetail((t) => ({
        ...t,
        subtasks: t.subtasks.map((x) =>
          x.id === sub.id ? { ...x, status: newStatus } : x
        )
      }));
    } catch (err) {
      console.error('toggleSubtask error', err);
    }
  };

  const handleDeleteSubtask = async (sub: Subtask) => {
    try {
      await axios.delete(`/api/tasks/${sub.id}`);
      setTaskDetail((t) => ({
        ...t,
        subtasks: t.subtasks.filter((x) => x.id !== sub.id)
      }));
    } catch (err) {
      console.error('deleteSubtask error', err);
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;
    try {
      const { data: c } = await axios.post<Comment>(
        `/api/tasks/${taskId}/comments`,
        { content: newComment }
      );
      setTaskDetail((t) => ({
        ...t,
        comments: [...t.comments, c]
      }));
      setNewComment('');
    } catch (err) {
      console.error('addComment error', err);
    }
  };

  const handleFileSelect = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || !taskId) return;
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files || !taskId) return;
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setUploadingFiles(true);
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const { data: a } = await axios.post<Attachment>(
          `/api/tasks/${taskId}/attachments`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setTaskDetail((t) => ({
          ...t,
          attachments: [...t.attachments, a]
        }));
      } catch (err) {
        console.error('uploadAttachment error', err);
      }
    }
    setUploadingFiles(false);
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    try {
      await axios.delete(`/api/attachments/${att.id}`);
      setTaskDetail((t) => ({
        ...t,
        attachments: t.attachments.filter((x) => x.id !== att.id)
      }));
    } catch (err) {
      console.error('deleteAttachment error', err);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <>
        <div className="p-4">Loading task...</div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white h-full overflow-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            className="text-2xl font-semibold border-b w-3/4 focus:outline-none"
            value={editBuffer.title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
          />
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            × Close
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          {/* Assignees */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Assignees</label>
            <select
              multiple
              className="border p-1"
              value={editBuffer.assignees}
              onChange={handleAssigneesChange}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          {/* Due Date */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              className="border p-1"
              value={editBuffer.due_date ?? ''}
              onChange={handleDueDateChange}
              onBlur={handleDueDateBlur}
            />
          </div>
          {/* Priority */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Priority</label>
            <select
              className="border p-1"
              value={editBuffer.priority}
              onChange={handlePriorityChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {/* Status */}
          <div className="flex items-center space-x-2">
            <label className="font-medium">Completed</label>
            <input
              type="checkbox"
              checked={editBuffer.status === 'completed'}
              onChange={handleStatusToggle}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            className="w-full border p-2"
            rows={4}
            value={editBuffer.description ?? ''}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
          />
        </div>

        {/* Subtasks */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Subtasks</h3>
          <ul className="space-y-2 mb-2">
            {taskDetail.subtasks.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={sub.status === 'completed'}
                    onChange={(e) => handleToggleSubtask(sub, e)}
                  />
                  <span
                    className={
                      sub.status === 'completed'
                        ? 'line-through text-gray-500'
                        : ''
                    }
                  >
                    {sub.title}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSubtask(sub)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <input
            type="text"
            placeholder="Add subtask and press Enter"
            className="border p-1 w-full"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleNewSubtaskKey}
          />
        </div>

        {/* Comments */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>
          <ul className="space-y-4 mb-4">
            {taskDetail.comments.map((c) => (
              <li key={c.id} className="flex space-x-3">
                <img
                  src={c.author_avatar_url || 'https://picsum.photos/seed/' + c.author_id + '/32/32'}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <div className="text-sm font-medium">
                    {c.author_name || 'Unknown'}{' '}
                    <span className="text-gray-400 text-xs">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1">{c.content}</div>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={handleCommentSubmit} className="space-y-2">
            <textarea
              rows={3}
              className="w-full border p-2"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                Comment
              </button>
            </div>
          </form>
        </div>

        {/* Attachments */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Attachments</h3>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed p-4 text-center mb-4"
          >
            {uploadingFiles
              ? 'Uploading...'
              : 'Drag files here or click to upload'}
            <input
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileSelect}
            />
          </div>
          <ul className="space-y-2">
            {taskDetail.attachments.map((a) => (
              <li
                key={a.id}
                className="flex justify-between items-center"
              >
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-600"
                >
                  {a.file_name}
                </a>
                <button
                  onClick={() => handleDeleteAttachment(a)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity Log */}
        {taskDetail.activity_logs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Activity Log
            </h3>
            <ul className="space-y-2">
              {taskDetail.activity_logs.map((log) => (
                <li key={log.id} className="text-sm text-gray-600">
                  {new Date(log.timestamp).toLocaleString()} –{' '}
                  {log.action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_TaskDetailPane;