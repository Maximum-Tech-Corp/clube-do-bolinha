"use client";

import { useRouter } from "next/navigation";

interface Props {
  years: number[];
  current: number;
}

export function YearSelect({ years, current }: Props) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) =>
        router.push(`/dashboard/rankings?ano=${e.target.value}`)
      }
      className="rounded-md border border-border bg-background px-2.5 h-8 text-sm focus:outline-none"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
