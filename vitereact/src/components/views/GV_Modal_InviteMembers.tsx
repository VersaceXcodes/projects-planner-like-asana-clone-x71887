import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '@/store/main';

// Module‑level listener array to manage modal open events
let openModalListeners: Array<() => void> = [];

/**
 * Call this function to open the Invite Members modal.
 * E.g., import { openModal } from '…/GV_Modal_InviteMembers' and invoke on button click.
 */
export const openModal = (): void => {
  openModalListeners.forEach(listener => listener());
};

const GV_Modal_InviteMembers: React.FC = () => {
  // Global workspace context
  const workspaceId = useAppSelector(state => state.current_workspace_id);

  // Local component state
  const [isOpen, setIsOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [pendingInvites, setPendingInvites] = useState<
    Array<{ id: string; email: string; created_at: string }>
  >([]);
  const [validationErrors, setValidationErrors] = useState<{ emailsInput?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);

  // Subscribe to openModal events
  useEffect(() => {
    const listener = () => setIsOpen(true);
    openModalListeners.push(listener);
    return () => {
      const idx = openModalListeners.indexOf(listener);
      if (idx !== -1) openModalListeners.splice(idx, 1);
    };
  }, []);

  // Fetch pending invites when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchPendingInvites();
    }
  }, [isOpen, workspaceId]);

  // Load existing pending invites
  const fetchPendingInvites = async () => {
    setIsLoadingInvites(true);
    try {
      const resp = await axios.get<Array<{ id: string; email: string; created_at: string }>>(
        `/api/workspaces/${workspaceId}/invites`
      );
      setPendingInvites(resp.data);
    } catch (err) {
      console.error('Failed to fetch pending invites', err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  // Track input changes, clear prior errors
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmailsInput(e.target.value);
    if (validationErrors.emailsInput) {
      setValidationErrors({});
    }
  };

  // Parse, validate, dedupe and send invites
  const handleSendInvites = async () => {
    if (!workspaceId) return;
    const emails = emailsInput.split(',').map(e => e.trim()).filter(e => e);
    if (!emails.length) {
      setValidationErrors({ emailsInput: 'Please enter at least one email address.' });
      return;
    }
    const invalidEmails = emails.filter(email => !/^\S+@\S+\.\S+$/.test(email));
    if (invalidEmails.length) {
      setValidationErrors({ emailsInput: `Invalid email address(es): ${invalidEmails.join(', ')}` });
      return;
    }
    const uniqueEmails = Array.from(new Set(emails));
    const alreadyInvited = pendingInvites.map(i => i.email);
    const duplicateInvites = uniqueEmails.filter(e => alreadyInvited.includes(e));
    if (duplicateInvites.length) {
      setValidationErrors({ emailsInput: `Already invited: ${duplicateInvites.join(', ')}` });
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await axios.post<
        Array<{ id: string; email: string; created_at: string }>
      >(`/api/workspaces/${workspaceId}/invites`, { emails: uniqueEmails });
      setPendingInvites(resp.data);
      setEmailsInput('');
    } catch (err: any) {
      console.error('Failed to send invites', err);
      const message = err.response?.data?.message || err.message;
      setValidationErrors({ emailsInput: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend an invite and refresh list
  const handleResend = async (inviteId: string) => {
    if (!workspaceId) return;
    try {
      await axios.post(`/api/workspaces/${workspaceId}/invites/${inviteId}/resend`);
      fetchPendingInvites();
    } catch (err) {
      console.error('Failed to resend invite', err);
    }
  };

  // Revoke an invite and refresh list
  const handleRevoke = async (inviteId: string) => {
    if (!workspaceId) return;
    try {
      await axios.delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`);
      fetchPendingInvites();
    } catch (err) {
      console.error('Failed to revoke invite', err);
    }
  };

  // Close modal and reset form
  const handleCancel = () => {
    setIsOpen(false);
    setEmailsInput('');
    setValidationErrors({});
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black opacity-50" onClick={handleCancel} />

          {/* Modal container */}
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg z-10 p-6">
            <h2 className="text-xl font-semibold">Invite Members</h2>

            {/* Email input */}
            <label htmlFor="emailsInput" className="mt-4 block text-sm font-medium text-gray-700">
              Email addresses (comma-separated)
            </label>
            <textarea
              id="emailsInput"
              className="mt-1 w-full border border-gray-300 rounded p-2"
              rows={3}
              value={emailsInput}
              onChange={handleInputChange}
            />
            {validationErrors.emailsInput && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.emailsInput}</p>
            )}

            {/* Pending invites list */}
            <div className="mt-6">
              <h3 className="text-lg font-medium">Pending Invites</h3>
              {isLoadingInvites ? (
                <p className="text-gray-500">Loading...</p>
              ) : pendingInvites.length ? (
                <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {pendingInvites.map(invite => (
                    <li key={invite.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{invite.email}</p>
                        <p className="text-xs text-gray-500">
                          Sent {new Date(invite.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="space-x-2">
                        <button
                          className="text-blue-600 text-sm hover:underline"
                          onClick={() => handleResend(invite.id)}
                        >
                          Resend
                        </button>
                        <button
                          className="text-red-600 text-sm hover:underline"
                          onClick={() => handleRevoke(invite.id)}
                        >
                          Revoke
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 mt-2">No pending invites.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSendInvites}
                disabled={isSubmitting}
              >
                Send Invites
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_Modal_InviteMembers;