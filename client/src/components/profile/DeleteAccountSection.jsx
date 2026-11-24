import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DeleteAccountSection() {
  const dialogRef = useRef(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setPassword('');
    setConfirmation('');
    setError('');
  };

  const closeDialog = () => {
    if (!deleting) dialogRef.current?.close();
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (confirmation !== 'DELETE' || !password || deleting) return;
    setError('');
    setDeleting(true);
    try {
      const response = await api.delete('/auth/account/', { data: { password, confirmation } });
      resetForm();
      logout();
      toast.success('Your account has been deleted.');
      if (response.data?.warning) {
        toast.error(response.data.warning, { duration: 10000 });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setPassword('');
      setError(getErrorMessage(err, 'Could not delete your account. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="bg-white rounded-md border border-red-200 p-4 sm:p-6 shadow-sm" aria-labelledby="delete-account-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 id="delete-account-heading" className="text-sm font-bold text-gray-900">Delete account</h3>
          <p className="mt-1 text-sm text-gray-600">Permanently remove your CampXChange account and associated activity.</p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); dialogRef.current?.showModal(); }}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Delete account
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        onCancel={(event) => { if (deleting) event.preventDefault(); }}
        onClose={resetForm}
        className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-md bg-white p-0 shadow-2xl backdrop:bg-black/60"
      >
        <form onSubmit={handleDelete} className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
            <div>
              <h2 id="confirm-delete-title" className="text-lg font-bold text-gray-900">Permanently delete your account?</h2>
              <p id="confirm-delete-description" className="mt-2 text-sm leading-relaxed text-gray-700">
                Your account, listings, saved items and related activity will be removed. Conversations and offers involving other people will also be deleted. This cannot be undone.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="delete-account-password" className="block text-sm font-semibold text-gray-800">Current CampXChange password</label>
              <input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={deleting}
                required
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <p className="mt-1.5 text-xs text-gray-600">
                If you sign in with Google, use your CampXChange password.{' '}
                {deleting ? (
                  <span className="text-gray-500">Reset password</span>
                ) : (
                  <Link to="/reset-password" onClick={closeDialog} className="font-semibold text-brand-700 underline">Reset password</Link>
                )}
              </p>
            </div>
            <div>
              <label htmlFor="delete-account-confirmation" className="block text-sm font-semibold text-gray-800">Type DELETE to confirm</label>
              <input
                id="delete-account-confirmation"
                type="text"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={deleting}
                required
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={closeDialog} disabled={deleting} className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={deleting || !password || confirmation !== 'DELETE'} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
