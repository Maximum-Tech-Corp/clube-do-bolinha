"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRetroactiveStat } from "@/actions/players-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  year: z.number().min(2000).max(2100),
  goals: z.number().min(0),
  assists: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

export function RetroactiveStatForm({ playerId }: { playerId: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      year: new Date().getFullYear() - 1,
      goals: 0,
      assists: 0,
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await addRetroactiveStat({
      playerId,
      year: data.year,
      goals: data.goals,
      assists: data.assists,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    reset({ year: new Date().getFullYear() - 1, goals: 0, assists: 0 });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            type="number"
            {...register("year", { valueAsNumber: true })}
          />
          {errors.year && (
            <p className="text-xs text-destructive">{errors.year.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="goals">Gols</Label>
          <Input
            id="goals"
            type="number"
            min={0}
            {...register("goals", { valueAsNumber: true })}
          />
          {errors.goals && (
            <p className="text-xs text-destructive">{errors.goals.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="assists">Assists</Label>
          <Input
            id="assists"
            type="number"
            min={0}
            {...register("assists", { valueAsNumber: true })}
          />
          {errors.assists && (
            <p className="text-xs text-destructive">{errors.assists.message}</p>
          )}
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" variant="outline" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "+ Adicionar lançamento"}
      </Button>
    </form>
  );
}
