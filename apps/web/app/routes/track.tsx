import { useLoaderData } from "react-router";
import type { Route } from "./+types/track";
import type { TrackDetail } from "@aihot/contracts/site";
import { apiGet, cachedPage } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { PhoneBar } from "../components/shell/PhoneBar";
import { navUp } from "../components/shell/nav";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: navUp("/hot").tab, name: "前沿" };
export { pageHeaders as headers } from "../lib/api.server";

const KEY = /^[a-z_-]{1,40}$/;

export async function loader({ params }: Route.LoaderArgs) {
  const key = params.key ?? "";
  if (!KEY.test(key)) throw new Response("not found", { status: 404 });
  let track: TrackDetail;
  try {
    track = await apiGet<TrackDetail>(`/api/site/track/${key}`, { signal: new AbortController().signal });
  } catch {
    throw new Response("not found", { status: 404 });
  }
  return cachedPage(600, { track });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const t = loaderData?.track;
  return pageMeta({
    title: `${t?.label ?? "轨道"} · 前沿榜`,
    description: t ? `${t.label}轨道近五年收录 ${t.count} 篇文献（期刊影响因子大于 10），其中精选 ${t.selectedCount} 篇、精读 ${t.deepReadCount} 篇。` : undefined,
    path: `/track/${t?.key ?? ""}`,
  });
}

/** 目的 / 方法 / 创新性 / 主要结果: the four sections of a generated deep reading. */
const SEGMENTS: Array<{ key: "objective" | "methods" | "novelty" | "results"; label: string }> = [
  { key: "objective", label: "研究目的" },
  { key: "methods", label: "方法" },
  { key: "novelty", label: "创新性" },
  { key: "results", label: "主要结果" },
];

function DeepRead({ deepRead }: { deepRead: NonNullable<TrackDetail["papers"][number]["deepRead"]> }) {
  const filled = SEGMENTS.filter((s) => {
    const v = deepRead[s.key];
    return typeof v === "string" && v.trim();
  });
  if (filled.length === 0) return null;
  return (
    <details className="mt-3 rounded-control bg-bg-sunk px-3.5 py-3">
      <summary className="cursor-pointer text-[12px] font-semibold text-accent">AI 精读</summary>
      <dl className="mt-2.5 space-y-2.5">
        {filled.map((s) => (
          <div key={s.key}>
            <dt className="text-[11.5px] font-semibold text-ink-3">{s.label}</dt>
            <dd className="mt-0.5 text-[13.5px] leading-[1.8] text-ink-2">{deepRead[s.key]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default function TrackPage() {
  const { track } = useLoaderData<typeof loader>();
  return (
    <div className="pb-10">
      <PhoneBar title={track.label} large back={{ to: "/hot", label: "前沿榜" }} />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-5 pt-1 sm:px-6 lg:px-0 lg:pt-1">
        <div>
          <h1 className="text-[24px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[26px]">{track.label}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            近五年收录 {track.count} 篇（期刊影响因子大于 10） · 精选 {track.selectedCount} 篇 · 精读 {track.deepReadCount} 篇 · 按期刊质量加权排序
          </p>
        </div>
        <a href="/hot" className="text-[12.5px] text-ink-4 transition-colors hover:text-ink-2">
          ← 前沿榜
        </a>
      </header>

      {track.papers.length === 0 ? (
        <div className="card rounded-sheet mx-4 sm:mx-6">
          <p className="p-6 text-center text-[13.5px] text-ink-4">该轨道近五年暂无符合入选线的收录。</p>
        </div>
      ) : (
        <ol className="card mx-4 divide-y divide-line-soft overflow-hidden sm:mx-6">
          {track.papers.map((p, i) => (
            <li key={p.itemId} className="px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <span className={`num text-[15px] font-semibold leading-[24px] ${i < 3 ? "text-accent" : "text-ink-4"}`}>{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15.5px] font-[650] leading-[1.55] text-ink">
                    <a href={`/items/${p.itemId}`} className="transition-colors hover:text-accent">
                      {p.title}
                    </a>
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-4">
                    {p.quartile && p.impactFactor && (
                      <span className="num rounded-full bg-bg-sunk px-2 py-0.5 text-[11.5px] text-accent">
                        {p.quartile}/{p.impactFactor}
                      </span>
                    )}
                    {p.journal && <span className="truncate">{p.journal}</span>}
                    <span className="num">{p.at.slice(0, 10).replace(/-/g, "/")}</span>
                  </div>
                  {p.deepRead && <DeepRead deepRead={p.deepRead} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
