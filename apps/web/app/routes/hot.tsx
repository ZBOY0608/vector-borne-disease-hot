import { useLoaderData } from "react-router";
import { IntentLink } from "../components/ui/IntentLink";
import type { FrontierBoardResponse, PaperHeat, TrackHeat } from "@aihot/contracts/site";
import { withSubject } from "@aihot/site";
import { apiGet, cachedPage } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { pageMeta } from "../lib/seo";
import { monthDayTime } from "../lib/format";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/Page";
import { IconChevronDown, IconInfo } from "../components/icons";
import { PhoneBar } from "../components/shell/PhoneBar";
import { navUp } from "../components/shell/nav";
import { scrollBehavior } from "../lib/motion";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: navUp("/hot").tab, name: "前沿" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: { request: Request }) {
  return cachedPage(600, { hot: await apiGet<FrontierBoardResponse>("/api/site/hot7", { signal: request.signal }) });
}

export function meta() {
  return pageMeta({
    title: withSubject("前沿榜"),
    description: "近五年收录、期刊影响因子大于 10 的文献，按期刊影响因子加权与 AI 评分排出最前沿的研究：顶刊与大子刊浮在前面，徽章只给 Nature/Science 级正刊。",
    path: "/hot",
    image: "/og/pages/hot.png",
  });
}

const RANK_COLOR = ["text-rank-1", "text-rank-2", "text-rank-3"];
const rankColor = (rank: number) => RANK_COLOR[rank - 1] ?? "text-rank-rest";
const pad = (rank: number) => String(rank).padStart(2, "0");

/** One track's year: how much came in, how much cleared the bar, and the paper in the strongest journal. */
function TrackCard({ t }: { t: TrackHeat }) {
  const metricsLine = t.top && (t.top.quartile || t.top.impactFactor)
    ? [t.top.quartile, t.top.impactFactor].filter(Boolean).join("/")
    : null;
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold text-ink">{t.label}</h2>
        <span className="num shrink-0 text-[12.5px] text-ink-4">
          {t.count} 篇{t.selectedCount > 0 ? ` · 精选 ${t.selectedCount}` : ""}
        </span>
      </div>
      {t.top && (
        <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-[1.6] text-ink-2">
          {metricsLine && <span className="mr-1.5 whitespace-nowrap text-[11.5px] font-semibold text-accent">{metricsLine}</span>}
          {t.top.journal && <span className="mr-1.5 whitespace-nowrap text-[11.5px] text-ink-4">{t.top.journal}</span>}
          <IntentLink viewTransition to={`/items/${t.top.itemId}`} className="transition-colors hover:text-accent">
            {t.top.title}
          </IntentLink>
        </p>
      )}
    </div>
  );
}

/** One row of the frontier list: rank, title, journal standing and the date it was published. */
function PaperRow({ p, rank }: { p: PaperHeat; rank: number }) {
  const metricsLine = [p.quartile, p.impactFactor].filter(Boolean).join("/");
  return (
    <li className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3.5 transition-colors hover:bg-bg-sunk/70 sm:px-5 dark:hover:bg-bg-muted/40">
      <span className={`num text-[16px] font-semibold leading-[24px] ${rankColor(rank)}`} aria-label={`前沿排名第 ${rank} 位`}>
        {pad(rank)}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-[650] leading-[1.55] text-ink">
          <IntentLink viewTransition to={`/items/${p.itemId}`} className="transition-colors hover:text-accent">
            {p.title}
          </IntentLink>
          {p.isTop && (
            <Badge tone="hot" title="Nature/Science 级的正刊（Nature、Science、Cell、NEJM、Lancet、BMJ 等）">
              顶刊
            </Badge>
          )}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[12px] text-ink-4">
          {metricsLine && <span className="num text-accent">{metricsLine}</span>}
          <span className="rounded-full bg-bg-sunk px-2 py-0.5 text-[11.5px] text-ink-3">{p.categoryLabel}</span>
          <span>{p.journal ?? p.sourceName}</span>
          <span className="num">{p.at.slice(0, 10).replace(/-/g, "/")}</span>
        </div>
      </div>
    </li>
  );
}

/** Opens "榜单是怎么算的" at the foot of the page and brings it into view. */
function showMethod() {
  const method = document.getElementById("hot-method") as HTMLDetailsElement | null;
  if (!method) return;
  method.open = true;
  method.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
}

export default function HotPage() {
  const { hot } = useLoaderData<typeof loader>();
  const total = hot.tracks.reduce((n, t) => n + t.count, 0);
  return (
    <div className="pb-10">
      <PhoneBar
        title="前沿"
        large
        sub={
          <>
            近五年精选 {total} 篇 · {hot.tracks.length} 条轨道
            {hot.computedAt && (
              <>
                {" · "}
                <span className="num">{monthDayTime(hot.computedAt)}</span> 更新
              </>
            )}
          </>
        }
        actions={
          <button type="button" onClick={showMethod} className="flex h-11 items-center gap-1 px-3 text-[14px] text-accent active:opacity-50">
            <IconInfo size={17} /> 怎么算
          </button>
        }
      />
      <header className="hidden flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-5 pt-1 lg:flex">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-hot">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-hot opacity-30" />
              <span className="relative inline-flex size-2 rounded-full bg-hot" />
            </span>
            近五年 · IF 大于 10
          </div>
          <h1 className="mt-1.5 text-[24px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[26px]">{withSubject("前沿榜")}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            近五年收录 {total} 篇文献（期刊影响因子大于 10） · {hot.tracks.length} 条轨道 · 期刊质量加权排序
          </p>
        </div>
        {hot.computedAt && (
          <p className="text-[12px] text-ink-4">
            <span className="num">{monthDayTime(hot.computedAt)}</span> 更新 · 每小时刷新
          </p>
        )}
      </header>

      {hot.tracks.length === 0 ? (
        <div className="card rounded-sheet">
          <EmptyState title="近五年还没有符合入选线的收录">站点收录到影响因子大于 10 的期刊文献后，这里会按轨道排出最前沿的研究。</EmptyState>
        </div>
      ) : (
        <section aria-label="轨道分组" className="grid grid-cols-1 gap-4 @[900px]:grid-cols-2 @[1300px]:grid-cols-3">
          {hot.tracks.map((t) => {
            const key = t.key ?? "other";
            return (
              <IntentLink
                key={t.key ?? "other"}
                viewTransition
                to={`/track/${key}`}
                className="card card-hover group flex flex-col p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-bold text-ink transition-colors group-hover:text-accent">{t.label}</h2>
                  <span className="num shrink-0 text-[12.5px] text-ink-4">{t.count} 篇</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-4">
                  {t.selectedCount > 0 && <span>精选 {t.selectedCount}</span>}
                  <span>
                    精读 <span className="num">{t.deepReadCount}</span>/{t.count}
                  </span>
                </div>
                {t.top && (
                  <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-[1.6] text-ink-2">
                    {t.top.quartile && t.top.impactFactor && (
                      <span className="num mr-1.5 whitespace-nowrap text-[11.5px] font-semibold text-accent">
                        {t.top.quartile}/{t.top.impactFactor}
                      </span>
                    )}
                    {t.top.journal && <span className="mr-1.5 whitespace-nowrap text-[11.5px] text-ink-4">{t.top.journal}</span>}
                    <span className="line-clamp-2">{t.top.title}</span>
                  </p>
                )}
              </IntentLink>
            );
          })}
        </section>
      )}

      <details id="hot-method" className="disclosure group/method mt-8 scroll-mt-[calc(var(--bar-h)+16px)] text-[12px] text-ink-4">
        <summary className="flex items-center gap-1.5 py-1 transition-colors hover:text-ink-2">
          <IconInfo size={15} />
          榜单是怎么算的？
          <span className="ml-auto inline-flex items-center gap-0.5">
            <span className="group-open/method:hidden">了解榜单</span>
            <span className="hidden group-open/method:inline">收起</span>
            <IconChevronDown size={13} className="transition-transform duration-200 group-open/method:rotate-180" />
          </span>
        </summary>
        <div className="max-w-[760px] space-y-2 pb-2 pl-[21px] pt-2 leading-[1.75] text-ink-3">
          <p>榜单看近五年发表、且期刊影响因子大于 10 的全部收录（含回溯检索入库的文献），按「期刊影响因子加权 + 评分」排序：发表在更高影响力期刊上的研究浮在前面。顶刊徽章只标注 Nature/Science 级的正刊（Nature、Science、Cell、NEJM、Lancet、BMJ 等），Nature Communications 一类同门与子刊不标注。</p>
          <p>评分反映证据强度、新颖性、相关度、影响与可执行性（五维加权），仅用于排序；期刊的分区与影响因子来自 JCR 2026（本站运营者自备的指标表），按期刊名匹配，表内查无的期刊无从判断，不入榜。</p>
          <p>只统计公开可见的收录；被下架或调整为仅摘要的条目会从榜单移除。每小时刷新一次。</p>
        </div>
      </details>
    </div>
  );
}
