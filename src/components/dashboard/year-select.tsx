'use client';

import { useRouter } from 'next/navigation';

interface Props {
  years: number[];
  current: number;
}

export function YearSelect({ years, current }: Props) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={e => router.push(`/dashboard/rankings?ano=${e.target.value}`)}
      className="rounded-md border border-gray-300 bg-background px-3 py-2 h-auto text-sm focus:outline-none"
    >
      {years.map(y => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
