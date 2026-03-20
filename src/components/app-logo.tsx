interface Props {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { ball: "w-10 h-10 text-2xl", title: "text-lg", gap: "gap-2" },
  md: { ball: "w-14 h-14 text-3xl", title: "text-2xl", gap: "gap-3" },
  lg: { ball: "w-20 h-20 text-4xl", title: "text-3xl", gap: "gap-4" },
};

export function AppLogo({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <div className={`flex flex-col items-center ${s.gap}`}>
      <div
        className={`${s.ball} rounded-full bg-primary flex items-center justify-center shadow-md`}
      >
        <span role="img" aria-label="bola de futebol">
          ⚽
        </span>
      </div>
      <span className={`font-bold tracking-tight ${s.title}`}>
        Clube do Bolinha
      </span>
    </div>
  );
}
