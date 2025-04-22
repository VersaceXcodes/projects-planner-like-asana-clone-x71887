import React from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/main';

/* Shared Global Views */
import GV_Sidebar from '@/components/views/GV_Sidebar.tsx';
import GV_TopBar from '@/components/views/GV_TopBar.tsx';
import GV_UserMenu from '@/components/views/GV_UserMenu.tsx';
import GV_QuickAddMenu from '@/components/views/GV_QuickAddMenu.tsx';
import GV_SearchDropdown from '@/components/views/GV_SearchDropdown.tsx';
import GV_Modal_NewProject from '@/components/views/GV_Modal_NewProject.tsx';
import GV_Modal_QuickAddTask from '@/components/views/GV_Modal_QuickAddTask.tsx';
import GV_Modal_InviteMembers from '@/components/views/GV_Modal_InviteMembers.tsx';
import GV_Modal_Confirmation from '@/components/views/GV_Modal_Confirmation.tsx';

/* Unique Views */
import UV_Landing from '@/components/views/UV_Landing.tsx';
import UV_SignUp from '@/components/views/UV_SignUp.tsx';
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword.tsx';
import UV_ResetPassword from '@/components/views/UV_ResetPassword.tsx';
import UV_EmailVerificationPrompt from '@/components/views/UV_EmailVerificationPrompt.tsx';
import UV_InviteAcceptance from '@/components/views/UV_InviteAcceptance.tsx';
import UV_WorkspaceCreation from '@/components/views/UV_WorkspaceCreation.tsx';
import UV_MyTasks from '@/components/views/UV_MyTasks.tsx';
import UV_Inbox from '@/components/views/UV_Inbox.tsx';
import UV_ProjectList from '@/components/views/UV_ProjectList.tsx';
import UV_ProjectDetailList from '@/components/views/UV_ProjectDetailList.tsx';
import UV_ProjectDetailBoard from '@/components/views/UV_ProjectDetailBoard.tsx';
import UV_TaskDetailPane from '@/components/views/UV_TaskDetailPane.tsx';
import UV_WorkspaceSettings from '@/components/views/UV_WorkspaceSettings.tsx';
import UV_UserProfileSettings from '@/components/views/UV_UserProfileSettings.tsx';
import UV_AccountSettings from '@/components/views/UV_AccountSettings.tsx';
import UV_NotificationSettings from '@/components/views/UV_NotificationSettings.tsx';

const App: React.FC = () => {
  const isAuthenticated = useAppSelector(
    (state) => state.auth.is_authenticated
  );

  return (
    <>
      <div className="flex h-screen">
        {isAuthenticated && <GV_Sidebar />}

        <div className="flex-1 flex flex-col">
          {isAuthenticated && <GV_TopBar />}

          <main className="flex-1 overflow-auto">
            <Routes>
              {/* Root: landing vs my tasks */}
              <Route
                path="/"
                element={
                  isAuthenticated ? <UV_MyTasks /> : <UV_Landing />
                }
              />

              {/* Public authentication flows */}
              <Route path="/sign-up" element={<UV_SignUp />} />
              <Route path="/log-in" element={<UV_Login />} />
              <Route
                path="/forgot-password"
                element={<UV_ForgotPassword />}
              />
              <Route
                path="/reset-password"
                element={<UV_ResetPassword />}
              />
              <Route
                path="/verify-email"
                element={<UV_EmailVerificationPrompt />}
              />
              <Route
                path="/accept-invite"
                element={<UV_InviteAcceptance />}
              />

              {/* Protected / workspace flow */}
              <Route
                path="/workspace-creation"
                element={
                  isAuthenticated ? (
                    <UV_WorkspaceCreation />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />

              {/* Protected in‑app views */}
              <Route
                path="/inbox"
                element={
                  isAuthenticated ? <UV_Inbox /> : <Navigate to="/log-in" replace />
                }
              />
              <Route
                path="/projects"
                element={
                  isAuthenticated ? (
                    <UV_ProjectList />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/projects/:project_id/list"
                element={
                  isAuthenticated ? (
                    <UV_ProjectDetailList />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/projects/:project_id/board"
                element={
                  isAuthenticated ? (
                    <UV_ProjectDetailBoard />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/tasks/:task_id"
                element={
                  isAuthenticated ? (
                    <UV_TaskDetailPane />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />

              {/* Protected settings */}
              <Route
                path="/workspace-settings"
                element={
                  isAuthenticated ? (
                    <UV_WorkspaceSettings />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/profile-settings"
                element={
                  isAuthenticated ? (
                    <UV_UserProfileSettings />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/account-settings"
                element={
                  isAuthenticated ? (
                    <UV_AccountSettings />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
              <Route
                path="/notification-settings"
                element={
                  isAuthenticated ? (
                    <UV_NotificationSettings />
                  ) : (
                    <Navigate to="/log-in" replace />
                  )
                }
              />
            </Routes>
          </main>
        </div>
      </div>

      {/* Global overlays & modals for authenticated users */}
      {isAuthenticated && (
        <>
          <GV_UserMenu />
          <GV_QuickAddMenu />
          <GV_SearchDropdown />
          <GV_Modal_NewProject />
          <GV_Modal_QuickAddTask />
          <GV_Modal_InviteMembers />
          <GV_Modal_Confirmation />
        </>
      )}
    </>
  );
};

export default App;