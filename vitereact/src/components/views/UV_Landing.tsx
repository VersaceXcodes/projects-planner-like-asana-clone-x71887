import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const UV_Landing: React.FC = () => {
  useEffect(() => {
    document.title = 'ProjectPlanner – Asana‑Style Project Management';
    const descriptionContent =
      'ProjectPlanner helps teams collaborate, organize tasks, and deliver projects on time.';
    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', descriptionContent);
    } else {
      meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = descriptionContent;
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="bg-white">
        <div className="container mx-auto px-6 py-16 text-center">
          <img
            src="https://picsum.photos/seed/landing/800/450"
            alt="Illustration of team collaborating on projects"
            className="mx-auto mb-8 w-full max-w-xl rounded-lg shadow-md"
          />
          <h1 className="text-4xl font-extrabold mb-4 text-gray-900">
            ProjectPlanner
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Collaborate, organize, and track your projects with ease.
          </p>
          <div className="flex justify-center space-x-4 mb-12">
            <Link
              to="/sign-up"
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              aria-label="Sign up for ProjectPlanner"
            >
              Sign Up
            </Link>
            <Link
              to="/log-in"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
              aria-label="Log in to ProjectPlanner"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="bg-gray-50">
        <div className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-semibold text-center text-gray-900 mb-8">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                List &amp; Board Views
              </h3>
              <p className="text-gray-600">
                Organize your tasks in versatile list or Kanban board layouts.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Real‑time Collaboration
              </h3>
              <p className="text-gray-600">
                Stay updated with instant notifications and live updates.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Comments &amp; Attachments
              </h3>
              <p className="text-gray-600">
                Communicate with teammates and share files effortlessly.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                My Tasks &amp; Inbox
              </h3>
              <p className="text-gray-600">
                Keep track of your assigned tasks and notifications.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Project Management
              </h3>
              <p className="text-gray-600">
                Create, rename, archive, and delete projects on demand.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">
                Secure &amp; Reliable
              </h3>
              <p className="text-gray-600">
                Built with JWT authentication and secure data storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} ProjectPlanner. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default UV_Landing;