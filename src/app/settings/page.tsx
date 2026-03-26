"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import type { User, Couple } from "@/types/database";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Bogota",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<{ display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const res = await fetch("/api/couple");
    const data = await res.json();

    setProfile(data.user);
    setPartner(data.partner);
    setDisplayName(data.user?.display_name || "");
    setTimezone(data.user?.timezone || "America/New_York");

    if (data.user?.couple_id) {
      const { data: coupleData } = await supabase
        .from("couples")
        .select("*")
        .eq("id", data.user.couple_id)
        .single();
      setCouple(coupleData);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("users")
      .update({
        display_name: displayName.trim(),
        timezone,
      })
      .eq("id", profile.id);

    if (couple) {
      await supabase
        .from("couples")
        .update({ timezone })
        .eq("id", couple.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  if (loading) return <Loading />;

  return (
    <AppShell streakCount={couple?.streak_count}>
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-textprimary mb-1">
            Settings
          </h2>
          <p className="text-sm text-textsecondary">Manage your account.</p>
        </motion.div>

        {/* Profile */}
        <Card>
          <h3 className="text-sm font-medium text-textprimary mb-4">
            Profile
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-textsecondary block mb-1">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-sm text-textprimary transition"
              />
            </div>
            <div>
              <label className="text-xs text-textsecondary block mb-1">
                Timezone (for daily reset)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-sm text-textprimary transition"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
              </Button>
              {saved && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-600"
                >
                  Changes saved
                </motion.span>
              )}
            </div>
          </div>
        </Card>

        {/* Couple info */}
        {couple && (
          <Card delay={0.1}>
            <h3 className="text-sm font-medium text-textprimary mb-4">
              Your Space
            </h3>
            <div className="space-y-3">
              {partner && (
                <div>
                  <p className="text-xs text-textsecondary">
                    Connected with
                  </p>
                  <p className="text-sm text-textprimary">
                    {partner.display_name}
                  </p>
                </div>
              )}
              {!couple.user_2_id && (
                <div>
                  <p className="text-xs text-textsecondary mb-1">
                    Share this invite code with your partner
                  </p>
                  <div className="font-mono text-lg tracking-widest text-textprimary bg-[var(--md-sys-color-surface-container-high)] rounded-2xl p-3 text-center">
                    {couple.invite_code}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-textsecondary">Streak</p>
                <p className="text-sm text-textprimary">
                  {couple.streak_count} day
                  {couple.streak_count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Privacy note */}
        <p className="text-xs text-textmuted text-center">
          Your data stays private.
        </p>

        {/* Sign out */}
        <div className="text-center pt-4">
          <button
            onClick={handleSignOut}
            className="text-sm text-textmuted hover:text-textsecondary transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
