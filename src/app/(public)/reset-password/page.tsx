"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "../actions";
import { Field, inputCls, btnPrimary, Card, Alert } from "@/components/ui";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <Card className="mt-6">
        {!token ? (
          <Alert kind="error">Missing reset token. Use the link from your email.</Alert>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== confirm) {
                setError("Passwords do not match");
                return;
              }
              setSubmitting(true);
              setError(undefined);
              const res = await resetPasswordAction(token, password);
              if (res?.error) {
                setError(res.error);
                setSubmitting(false);
              }
            }}
          >
            {error && <Alert kind="error">{error}</Alert>}
            <Field label="New password" required hint="Min 8 chars, 1 uppercase, 1 number">
              <input
                className={inputCls}
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" required>
              <input
                className={inputCls}
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
