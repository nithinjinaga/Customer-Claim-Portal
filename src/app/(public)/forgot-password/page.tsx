"use client";

import { useState } from "react";
import { forgotPasswordAction } from "../actions";
import { Field, inputCls, btnPrimary, Card, Alert } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <Card className="mt-6">
        {sent ? (
          <Alert kind="success">
            If an account exists for {email}, a reset link has been sent. The
            link is valid for 1 hour.
          </Alert>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              await forgotPasswordAction(email);
              setSent(true);
            }}
          >
            <Field label="Registered email" required>
              <input
                className={inputCls}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
