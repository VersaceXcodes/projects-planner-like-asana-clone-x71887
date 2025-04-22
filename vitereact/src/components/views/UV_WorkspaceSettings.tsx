import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector, useAppDispatch, update_workspace } from '@/store/main';

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  role: string;
  joined_at: string;
}

interface WorkspaceInvite {
  id: string;
  email: string;
  created_at: string;
}

const UV_WorkspaceSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const workspaces = useAppSelector((s) => s.workspaces.list);
  const currentWorkspaceId = useAppSelector((s) => s.current_workspace_id);
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || null;

  // Local state
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [workspaceMeta, setWorkspaceMeta] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [workspaceNameInput, setWorkspaceNameInput] = useState<string>('');
  const [savingName, setSavingName] = useState<boolean>(false);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [loadingInvites, setLoadingInvites] = useState<boolean>(false);

  // Sync workspace meta & input from global store
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceMeta({ id: currentWorkspace.id, name: currentWorkspace.name });
      setWorkspaceNameInput(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  // Fetch members
  const fetchMembers = async () => {
    if (!currentWorkspaceId) return;
    try {
      setLoadingMembers(true);
      const resp = await axios.get<WorkspaceMember[]>(
        `/api/workspaces/${currentWorkspaceId}/members`
      );
      setMembers(resp.data);
    } catch (err) {
      console.error('fetchMembers error', err);
      window.alert('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch invites
  const fetchInvites = async () => {
    if (!currentWorkspaceId) return;
    try {
      setLoadingInvites(true);
      const resp = await axios.get<WorkspaceInvite[]>(
        `/api/workspaces/${currentWorkspaceId}/invites`
      );
      setPendingInvites(resp.data);
    } catch (err) {
      console.error('fetchInvites error', err);
      window.alert('Failed to load invites');
    } finally {
      setLoadingInvites(false);
    }
  };

  // Initial load of members & invites
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchMembers();
      fetchInvites();
    }
  }, [currentWorkspaceId]);

  // Save workspace name
  const saveWorkspaceName = async () => {
    if (!currentWorkspaceId) return;
    try {
      setSavingName(true);
      const resp = await axios.patch(
        `/api/workspaces/${currentWorkspaceId}`,
        { name: workspaceNameInput.trim() }
      );
      // resp.data should be the updated workspace object
      const updated: any = resp.data;
      // preserve current role
      const role = currentWorkspace?.role || 'member';
      dispatch(
        update_workspace({
          id: updated.id,
          name: updated.name,
          role,
          created_at: updated.created_at,
          updated_at: updated.updated_at
        })
      );
      setWorkspaceMeta({ id: updated.id, name: updated.name });
      window.alert('Workspace name updated');
    } catch (err) {
      console.error('saveWorkspaceName error', err);
      window.alert('Failed to save workspace name');
    } finally {
      setSavingName(false);
    }
  };

  // Remove a member
  const removeMember = async (memberId: string) => {
    if (!currentWorkspaceId) return;
    const ok = window.confirm('Are you sure you want to remove this member?');
    if (!ok) return;
    try {
      await axios.delete(
        `/api/workspaces/${currentWorkspaceId}/members/${memberId}`
      );
      setMembers((m) => m.filter((x) => x.id !== memberId));
    } catch (err) {
      console.error('removeMember error', err);
      window.alert('Failed to remove member');
    }
  };

  // Resend invite
  const resendInvite = async (inviteId: string) => {
    if (!currentWorkspaceId) return;
    try {
      setLoadingInvites(true);
      await axios.post(
        `/api/workspaces/${currentWorkspaceId}/invites/${inviteId}/resend`
      );
      window.alert('Invite resent');
    } catch (err) {
      console.error('resendInvite error', err);
      window.alert('Failed to resend invite');
    } finally {
      setLoadingInvites(false);
    }
  };

  // Revoke invite
  const revokeInvite = async (inviteId: string) => {
    if (!currentWorkspaceId) return;
    try {
      setLoadingInvites(true);
      await axios.delete(
        `/api/workspaces/${currentWorkspaceId}/invites/${inviteId}`
      );
      setPendingInvites((inv) => inv.filter((x) => x.id !== inviteId));
    } catch (err) {
      console.error('revokeInvite error', err);
      window.alert('Failed to revoke invite');
    } finally {
      setLoadingInvites(false);
    }
  };

  // Open global invite modal (stub via CustomEvent)
  const inviteMembers = () => {
    window.dispatchEvent(new CustomEvent('open_invite_modal'));
  };

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Workspace Settings</h1>
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              className={`mr-6 pb-2 ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`pb-2 ${
                activeTab === 'members'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
          </nav>
        </div>

        {activeTab === 'details' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceNameInput}
              onChange={(e) => setWorkspaceNameInput(e.target.value)}
              className="border rounded px-3 py-2 w-full mb-4"
            />
            <button
              onClick={saveWorkspaceName}
              disabled={
                savingName ||
                workspaceNameInput.trim() === '' ||
                workspaceNameInput.trim() === workspaceMeta.name
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded disabled:opacity-50"
            >
              {savingName ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Members</h2>
              <button
                onClick={inviteMembers}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
              >
                Invite Members
              </button>
            </div>

            {loadingMembers ? (
              <p>Loading members...</p>
            ) : (
              <ul className="space-y-4 mb-6">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      {m.user.avatar_url && (
                        <img
                          src={m.user.avatar_url}
                          alt={m.user.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      )}
                      <div>
                        <p className="font-medium">{m.user.name}</p>
                        <p className="text-sm text-gray-500">
                          {m.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-2 py-1 bg-gray-200 rounded text-sm">
                        {m.role}
                      </span>
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h2 className="text-lg font-medium mb-2">Pending Invites</h2>
            {loadingInvites ? (
              <p>Loading invites...</p>
            ) : (
              <ul className="space-y-4">
                {pendingInvites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-sm text-gray-500">
                        Sent at{' '}
                        {new Date(inv.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => resendInvite(inv.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => revokeInvite(inv.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default UV_WorkspaceSettings;