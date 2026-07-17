"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/validation";
import { loginAction } from "@/app/(public)/actions";
import { Field, inputCls, btnPrimary, Card, Alert } from "@/components/ui";

type FormValues = z.input<typeof loginSchema>;

export default function LoginForm({ staff = false }: { staff?: boolean }) {
  const params = useSearchParams();
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    setServerError(undefined);
    const res = await loginAction(
      data,
      staff ? "/admin" : (params.get("next") ?? undefined),
    );
    if (res?.error) {
      setServerError(res.error);
      setSubmitting(false);
    }
  });

  return (
    <Card className="mt-6">
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {!staff && params.get("registered") && (
          <Alert kind="success">Account created. Log in to continue.</Alert>
        )}
        {!staff && params.get("reset") && (
          <Alert kind="success">Password updated. Log in with your new password.</Alert>
        )}
        {serverError && <Alert kind="error">{serverError}</Alert>}

        <Field label="Email" required error={errors.email?.message}>
          <input className={inputCls} type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <input
            className={inputCls}
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </Field>

        <div className="flex items-center justify-between">
          {staff ? (
            <span />
          ) : (
            <a href="/forgot-password" className="text-sm font-medium text-pe-blue hover:underline">
              Forgot password?
            </a>
          )}
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Logging in…" : "Login"}
          </button>
        </div>
      </form>
    </Card>
  );
}
