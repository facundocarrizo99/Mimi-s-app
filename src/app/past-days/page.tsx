"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Loading } from "@/components/ui/Loading";
import type { Couple } from "@/types/database";

interface PastDate {
  date: string;
  date_key?: string;
  month_key?: string;
  day_of_month?: number | null;
  totalQuestions: number;
  myAnswerCount: number;
  partnerAnswerCount: number;
  isToday: boolean;
  isComplete: boolean;
}

export default function PastDaysPage() {
  const [dates, setDates] = useState<PastDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const coupleId = searchParams.get("couple");
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (!coupleId) {
        router.push("/couples");
        return;
      }

      // Couple info for streak
      const { data: coupleDetail } = await supabase
        .from("couples")
        .select("*")
        .eq("id", coupleId)
        .single();
      setCouple(coupleDetail);

      // Fetch first page for fast initial render, then stream remaining pages.
      const aggregatedDates: PastDate[] = [];
      let page = 1;
      const maxPages = 24;

      let firstResponse: Response;
      try {
        firstResponse = await fetch(`/api/past-days?couple_id=${coupleId}&page=${page}`, {
          cache: "no-store",
        });
      } catch (error) {
        console.error("Failed to fetch past-days page", { page, error });
        setDates([]);
        setSelectedMonth(getCurrentMonth());
        setLoading(false);
        return;
      }

      if (!firstResponse.ok) {
        console.error("Past-days API request failed", {
          page,
          status: firstResponse.status,
          statusText: firstResponse.statusText,
        });
        setDates([]);
        setSelectedMonth(getCurrentMonth());
        setLoading(false);
        return;
      }

      const firstPageData = (await firstResponse.json().catch(() => ({}))) as {
        dates?: PastDate[];
        hasMore?: boolean;
      };

      if (!Array.isArray(firstPageData.dates)) {
        setDates([]);
        setSelectedMonth(getCurrentMonth());
        setLoading(false);
        return;
      }

      aggregatedDates.push(...firstPageData.dates);
      setDates([...aggregatedDates]);

      const latestPastDate = aggregatedDates.find((d) => !d.isToday);
      if (latestPastDate) {
        setSelectedMonth(getMonthKey(latestPastDate) || getCurrentMonth());
      } else {
        setSelectedMonth(getCurrentMonth());
      }

      setLoading(false);

      let hasMore = Boolean(firstPageData.hasMore) && firstPageData.dates.length > 0;
      page += 1;

      while (hasMore && page <= maxPages) {
        let res: Response;
        try {
          res = await fetch(`/api/past-days?couple_id=${coupleId}&page=${page}`, {
            cache: "no-store",
          });
        } catch (error) {
          console.error("Failed to fetch past-days page", { page, error });
          break;
        }

        if (!res.ok) {
          console.error("Past-days API request failed", {
            page,
            status: res.status,
            statusText: res.statusText,
          });
          break;
        }

        const data = (await res.json().catch(() => ({}))) as {
          dates?: PastDate[];
          hasMore?: boolean;
        };

        if (!Array.isArray(data.dates) || data.dates.length === 0) {
          break;
        }

        aggregatedDates.push(...data.dates);
        setDates([...aggregatedDates]);
        hasMore = Boolean(data.hasMore);
        page += 1;
      }
    } catch (error) {
      console.error("Failed to load past-days data", error);
      setDates([]);
      setSelectedMonth(getCurrentMonth());
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pastDates = dates.filter((d) => !d.isToday);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const d of pastDates) {
      const monthKey = getMonthKey(d);
      if (monthKey) {
        monthSet.add(monthKey.trim());
      }
    }
    const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return months.length > 0 ? months : [getCurrentMonth()];
  }, [pastDates]);

  const effectiveMonth = (selectedMonth || availableMonths[0] || getCurrentMonth()).trim();

  const selectedMonthData = pastDates.filter((d) => getMonthKey(d) === effectiveMonth);

  const dayMap = useMemo(() => {
    const map = new Map<number, PastDate>();
    for (const d of selectedMonthData) {
      if (typeof d.day_of_month === "number" && d.day_of_month >= 1 && d.day_of_month <= 31) {
        map.set(d.day_of_month, d);
        continue;
      }

      const dateKey = getDateKey(d);
      if (!dateKey) continue;
      const parts = dateKey.split("-");
      const dayNumber = Number(parts[2]);
      if (Number.isFinite(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
        map.set(dayNumber, d);
      }
    }
    return map;
  }, [selectedMonthData]);

  const calendarDays = useMemo(() => {
    const parsedMonth = parseMonthKey(effectiveMonth);
    const year = parsedMonth.year;
    const month = parsedMonth.month;

    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay();
    const today = getTodayISO();

    const cells: Array<{ date: string; day: number; entry?: PastDate; isFuture: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ date: `pad-${i}`, day: 0, isFuture: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${effectiveMonth}-${String(day).padStart(2, "0")}`;
      const entry = dayMap.get(day);
      cells.push({
        date,
        day,
        entry,
        isFuture: date > today,
      });
    }

    return cells;
  }, [dayMap, effectiveMonth]);
  const selectedMonthAnswered = selectedMonthData.reduce(
    (acc, d) => acc + d.myAnswerCount,
    0
  );
  const selectedMonthTotal = selectedMonthData.reduce(
    (acc, d) => acc + d.totalQuestions,
    0
  );
  const bothCompletedDays = selectedMonthData.filter(
    (d) => d.partnerAnswerCount === d.totalQuestions && d.myAnswerCount === d.totalQuestions
  ).length;

  if (loading) return <Loading />;

  return (
    <AppShell
      streakCount={couple?.streak_count}
      coupleId={coupleId || undefined}
    >
      <div className="space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-textprimary mb-1">
            Past Days
          </h2>
          <p className="text-sm text-textsecondary">
            Calendar view of your daily progress together.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="md3-surface p-4"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm text-textsecondary">Selected month</p>
              <p className="text-lg font-semibold text-textprimary">
                {formatMonthName(effectiveMonth)}
              </p>
            </div>
            <select
              value={effectiveMonth}
              onChange={(e) => setSelectedMonth(e.target.value.trim())}
              className="px-3 py-2 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-sm text-textprimary focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/30"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthName(month)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-2xl bg-[var(--md-sys-color-primary-container)] p-3 text-center">
              <p className="text-xs text-textsecondary">Your answers</p>
              <p className="text-base font-semibold text-textprimary">
                {selectedMonthAnswered}/{selectedMonthTotal}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--md-sys-color-secondary-container)] p-3 text-center">
              <p className="text-xs text-textsecondary">Both complete</p>
              <p className="text-base font-semibold text-textprimary">
                {bothCompletedDays}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--md-sys-color-tertiary-container)] p-3 text-center">
              <p className="text-xs text-textsecondary">Tracked days</p>
              <p className="text-base font-semibold text-textprimary">
                {selectedMonthData.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-[11px] text-textmuted text-center py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (cell.day === 0) {
                return <div key={cell.date} className="h-20" aria-hidden />;
              }

              const entry = cell.entry;
              const hasData = Boolean(entry);
              const isBothComplete =
                hasData &&
                (entry?.partnerAnswerCount ?? 0) === (entry?.totalQuestions ?? -1) &&
                (entry?.myAnswerCount ?? 0) === (entry?.totalQuestions ?? -1);
              const isMineComplete =
                hasData && (entry?.myAnswerCount ?? 0) === (entry?.totalQuestions ?? -1);

              return (
                <motion.button
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.2) }}
                  onClick={() => {
                    if (!hasData || cell.isFuture) return;
                    router.push(`/past-days/${cell.date}?couple=${coupleId}`);
                  }}
                  disabled={!hasData || cell.isFuture}
                  className={`h-20 rounded-2xl border p-1.5 text-left transition-all ${
                    !hasData || cell.isFuture
                      ? "bg-[var(--md-sys-color-surface-container-low)] border-[var(--md-sys-color-outline-variant)]/35 opacity-55"
                      : isBothComplete
                      ? "bg-[var(--md-sys-color-tertiary-container)] border-[var(--status-success)]/40 hover:brightness-105"
                      : isMineComplete
                      ? "bg-[var(--md-sys-color-secondary-container)] border-[var(--md-sys-color-secondary)]/30 hover:brightness-105"
                      : "bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]/30 hover:brightness-105"
                  }`}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <span className="text-[11px] font-semibold leading-none text-textprimary">
                        {cell.day}
                      </span>
                    </div>

                    <div className="flex-1 grid place-items-center">
                      <span className="text-[13px] font-medium leading-none text-textsecondary">
                        {hasData
                          ? `${entry?.myAnswerCount ?? 0}/${entry?.totalQuestions ?? 0}`
                          : "--/--"}
                      </span>
                    </div>

                    <div className="flex items-center justify-center">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          !hasData
                            ? "bg-[var(--md-sys-color-outline-variant)]/60"
                            : isBothComplete
                            ? "bg-[var(--status-success)]"
                            : isMineComplete
                            ? "bg-[var(--md-sys-color-secondary)]"
                            : "bg-[var(--md-sys-color-primary)]"
                        }`}
                        aria-hidden
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-center flex-wrap gap-4 mt-4 text-[11px] text-textsecondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-success)]" />
              Both finished
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-sys-color-secondary)]" />
              You finished
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-sys-color-primary)]" />
              Pending
            </span>
          </div>
        </motion.div>

        {/* Empty state */}
        {pastDates.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-3xl mb-3">&#128220;</p>
            <p className="text-lg font-medium text-textprimary mb-1">
              No past days yet
            </p>
            <p className="text-sm text-textsecondary">
              Come back tomorrow to see today&apos;s questions here.
            </p>
          </motion.div>
        )}

        {/* Back to today */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-4"
        >
          <button
            onClick={() => router.push(`/daily?couple=${coupleId}`)}
            className="text-sm text-textsecondary hover:text-textprimary transition"
          >
            &larr; Back to today
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}

function getCurrentMonth() {
  return getTodayISO().slice(0, 7);
}

function getMonthKey(value: PastDate) {
  if (value.month_key) {
    return value.month_key.trim();
  }

  const source = String(value.date).trim();
  const isoMonth = source.match(/^(\d{4})-(\d{2})/);
  if (isoMonth) {
    return `${isoMonth[1]}-${isoMonth[2]}`;
  }

  const slashDate = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    return `${slashDate[3]}-${String(Number(slashDate[1])).padStart(2, "0")}`;
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 7);
  }

  return null;
}

function getDateKey(value: PastDate) {
  if (value.date_key) {
    return value.date_key.trim();
  }

  const source = String(value.date).trim();
  const isoDate = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const slashDate = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    return `${slashDate[3]}-${String(Number(slashDate[1])).padStart(2, "0")}-${String(
      Number(slashDate[2])
    ).padStart(2, "0")}`;
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMonthName(month: string) {
  const parsedMonth = parseMonthKey(month);
  const date = new Date(parsedMonth.year, parsedMonth.month - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseMonthKey(value: string) {
  const clean = String(value).trim();
  const iso = clean.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]) };
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
  }

  const fallback = getCurrentMonth().split("-");
  return { year: Number(fallback[0]), month: Number(fallback[1]) };
}
