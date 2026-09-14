interface ComingSoonPageProps {
  title: string;
  day?: number;
}

export function ComingSoonPage({ title, day }: ComingSoonPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">
        {day ? `This module is planned for Day ${day}.` : 'Nothing here yet.'}
      </p>
    </div>
  );
}
