const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

function formatDate(d: Date): string {
  return `${d.getDate()}/${MONTHS_PT[d.getMonth()]}`;
}

export type GameAttendance = {
  gameId: string;
  date: Date;
  confirmed: number;
  waitlist: number;
};

const W = 300;
const H = 140;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 20;
const PAD_B = 28;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;
const MAX_BAR_W = 13;
const PAIR_GAP = 2;
const BASELINE_Y = PAD_T + CHART_H;

const COLOR_CONFIRMED = 'var(--primary)';
const COLOR_WAITLIST = '#fed015';

export function AttendanceChart({ data }: { data: GameAttendance[] }) {
  if (data.length === 0) return null;

  const hasWaitlist = data.some(d => d.waitlist > 0);

  const n = data.length;
  const slotW = CHART_W / n;
  const barW = Math.min(slotW * 0.35, MAX_BAR_W);
  const pairWidth = barW * 2 + PAIR_GAP;
  const pairOffset = (slotW - pairWidth) / 2;
  const maxCount = Math.max(...data.map(d => d.confirmed + d.waitlist), 1);
  const avgConfirmed = data.reduce((s, d) => s + d.confirmed, 0) / n;
  const avgY = PAD_T + CHART_H - (avgConfirmed / maxCount) * CHART_H;

  return (
    <div>
      <svg
        role="img"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Confirmações por jogo"
        className="text-foreground"
      >
        {/* Baseline */}
        <line
          x1={PAD_L}
          y1={BASELINE_Y}
          x2={W - PAD_R}
          y2={BASELINE_Y}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={1}
        />

        {/* Average confirmed dashed line */}
        <line
          x1={PAD_L}
          y1={avgY}
          x2={W - PAD_R}
          y2={avgY}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD_R - 2}
          y={avgY - 3}
          textAnchor="end"
          fontSize={8}
          fill="currentColor"
          fillOpacity={0.4}
        >
          média {Math.round(avgConfirmed)}
        </text>

        {data.map((d, i) => {
          const confirmedH = Math.max(3, (d.confirmed / maxCount) * CHART_H);
          const waitlistH =
            d.waitlist > 0 ? Math.max(3, (d.waitlist / maxCount) * CHART_H) : 0;

          const pairX = PAD_L + i * slotW + pairOffset;
          const confirmedX = pairX;
          const waitlistX = pairX + barW + PAIR_GAP;

          const confirmedY = BASELINE_Y - confirmedH;
          const waitlistY = BASELINE_Y - waitlistH;

          return (
            <g key={d.gameId}>
              {/* Confirmed bar */}
              <rect
                x={confirmedX}
                y={confirmedY}
                width={barW}
                height={confirmedH}
                rx={3}
                style={{ fill: COLOR_CONFIRMED }}
                fillOpacity={0.85}
              />
              <text
                x={confirmedX + barW / 2}
                y={confirmedY - 3}
                textAnchor="middle"
                fontSize={8}
                style={{ fill: COLOR_CONFIRMED }}
                fontWeight="600"
              >
                {d.confirmed}
              </text>

              {/* Waitlist bar (only if > 0) */}
              {d.waitlist > 0 && (
                <>
                  <rect
                    x={waitlistX}
                    y={waitlistY}
                    width={barW}
                    height={waitlistH}
                    rx={3}
                    fill={COLOR_WAITLIST}
                    fillOpacity={0.9}
                  />
                  <text
                    x={waitlistX + barW / 2}
                    y={waitlistY - 3}
                    textAnchor="middle"
                    fontSize={8}
                    fill={COLOR_WAITLIST}
                    fontWeight="600"
                  >
                    {d.waitlist}
                  </text>
                </>
              )}

              {/* Date label */}
              <text
                x={pairX + pairWidth / 2}
                y={BASELINE_Y + 14}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                fillOpacity={0.45}
              >
                {formatDate(d.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
            style={{ backgroundColor: COLOR_CONFIRMED }}
          />
          <span className="text-xs text-muted-foreground">Confirmados</span>
        </div>
        {hasWaitlist && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block shrink-0 border border-yellow-300"
              style={{ backgroundColor: COLOR_WAITLIST }}
            />
            <span className="text-xs text-muted-foreground">
              Lista de espera
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
