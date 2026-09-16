import { Link } from 'react-router';
import { EmptyState } from '../components/ui';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <EmptyState
        title={title}
        action={
          <Link to="/" className="text-[13.5px] font-medium text-accent-600 hover:underline">
            Back to the dashboard →
          </Link>
        }
      >
        That page does not exist.
      </EmptyState>
    </div>
  );
}
