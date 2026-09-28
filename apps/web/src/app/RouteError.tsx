import { RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '../components/ui';
import { reportError } from '../lib/monitoring';

/** Shown instead of a blank screen when a page throws while rendering or loading. */
export function RouteError() {
  const error = useRouteError();
  // After a deploy, an open tab can ask for a page chunk that no longer exists.
  const staleBuild =
    error instanceof TypeError &&
    /dynamically imported module|Importing a module script/i.test(error.message);

  useEffect(() => {
    if (!staleBuild && !isRouteErrorResponse(error)) reportError(error);
  }, [error, staleBuild]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="card w-full max-w-md px-7 py-9 text-center">
        <p className="eyebrow">{staleBuild ? 'Update available' : 'Something went wrong'}</p>
        <h1 className="mt-2 font-display text-[24px] text-ink-900">
          {staleBuild ? 'A newer version is ready' : 'This page could not be shown'}
        </h1>
        <p className="mt-2 text-ink-600">
          {staleBuild
            ? 'The app was updated while this tab was open. Reload to continue — your saved work is safe.'
            : 'The problem has been noted. Reloading usually helps; your saved work is not affected.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="primary" icon={RotateCw} onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Link
            to="/"
            reloadDocument
            className="text-[13.5px] font-medium text-accent-600 hover:underline"
          >
            Go to the dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
