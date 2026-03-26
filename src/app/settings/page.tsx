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
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeys, setPasskeys] = useState<
    { id: string; friendly_name?: string | null; created_at?: string; status?: string }[]
  >([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyError, setPasskeyError] = useState("");

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

    if (typeof window !== "undefined") {
      setPasskeySupported(
        Boolean(window.PublicKeyCredential && navigator.credentials)
      );
    }

    const { data: factorData } = await supabase.auth.mfa.listFactors();
    setPasskeys((factorData?.all || []).filter((f) => f.factor_type === "webauthn"));

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

  async function refreshPasskeys() {
    const { data: factorData } = await supabase.auth.mfa.listFactors();
    setPasskeys((factorData?.all || []).filter((f) => f.factor_type === "webauthn"));
  }

  async function handleCreatePasskey() {
    setPasskeyBusy(true);
    setPasskeyError("");
    setPasskeyMessage("");

    const friendlyName = `${displayName?.trim() || "My"} passkey`;
    const { error } = await supabase.auth.mfa.webauthn.register({
      friendlyName,
    });

    if (error) {
      if (error.message.toLowerCase().includes("mfa enroll is disabled for webauthn")) {
        setPasskeyError(
          "Passkeys are not enabled in Supabase yet. Go to Supabase Dashboard → Authentication → MFA and enable WebAuthn."
        );
      } else {
        setPasskeyError(error.message);
      }
      setPasskeyBusy(false);
      return;
    }

    await refreshPasskeys();
    setPasskeyMessage("Passkey added.");
    setPasskeyBusy(false);
  }

  async function handleVerifyPasskey() {
    setPasskeyBusy(true);
    setPasskeyError("");
    setPasskeyMessage("");

    const verifiedPasskey = passkeys.find((p) => p.status === "verified");
    if (!verifiedPasskey) {
      setPasskeyError("No verified passkey available yet.");
      setPasskeyBusy(false);
      return;
    }

    const { error } = await supabase.auth.mfa.webauthn.authenticate({
      factorId: verifiedPasskey.id,
    });

    if (error) {
      setPasskeyError(error.message);
      setPasskeyBusy(false);
      return;
    }

    setPasskeyMessage("Passkey verified for this session.");
    setPasskeyBusy(false);
  }

  async function handleDeletePasskey(factorId: string) {
    setPasskeyBusy(true);
    setPasskeyError("");
    setPasskeyMessage("");

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setPasskeyError(error.message);
      setPasskeyBusy(false);
      return;
    }

    await refreshPasskeys();
    setPasskeyMessage("Passkey removed.");
    setPasskeyBusy(false);
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

        <Card delay={0.2}>
          <h3 className="text-sm font-medium text-textprimary mb-3">Passkeys</h3>
          {!passkeySupported ? (
            <p className="text-sm text-textsecondary">
              This browser doesn&apos;t support passkeys. Use a modern browser or device to enable them.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-textsecondary">
                Add a passkey for stronger sign-in security. Keep magic link as backup.
              </p>
              <p className="text-xs text-textmuted">
                Requires Supabase WebAuthn MFA to be enabled in your project settings.
              </p>

              {passkeys.length === 0 ? (
                <p className="text-sm text-textmuted">No passkeys registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-3 border border-[var(--md-sys-color-outline-variant)]/45"
                    >
                      <p className="text-sm text-textprimary">
                        {passkey.friendly_name || "Passkey"}
                      </p>
                      <p className="text-xs text-textmuted">
                        {passkey.status || "unknown"} • {passkey.created_at ? new Date(passkey.created_at).toLocaleDateString() : "date unknown"}
                      </p>
                      <button
                        onClick={() => handleDeletePasskey(passkey.id)}
                        disabled={passkeyBusy}
                        className="mt-2 text-xs text-rose-dark hover:text-rose transition disabled:opacity-50"
                      >
                        Remove passkey
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreatePasskey} disabled={passkeyBusy} size="sm">
                  {passkeyBusy ? "Please wait..." : "Add passkey"}
                </Button>
                {passkeys.length > 0 && (
                  <Button
                    onClick={handleVerifyPasskey}
                    disabled={passkeyBusy}
                    size="sm"
                    variant="secondary"
                  >
                    Verify now
                  </Button>
                )}
              </div>

              {passkeyMessage && (
                <p className="text-xs text-emerald-700">{passkeyMessage}</p>
              )}
              {passkeyError && (
                <p className="text-xs text-rose-700">{passkeyError}</p>
              )}
            </div>
          )}
        </Card>

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
