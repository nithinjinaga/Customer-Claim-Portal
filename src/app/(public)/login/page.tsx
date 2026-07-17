"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/validation";
import { loginAction } from "../actions";
import { Field, inputCls, btnPrimary, Card, Alert } from "@/components/ui";

type FormValues = z.input<typeof loginSchema>;

function LoginForm() {
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
    const res = await loginAction(data, params.get("next") ?? undefined);
    if (res?.error) {
      setServerError(res.error);
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Login</h1>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {params.get("registered") && (
            <Alert kind="success">Account created. Log in to continue.</Alert>
          )}
          {params.get("reset") && (
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
            <Link href="/forgot-password" className="text-sm font-medium text-pe-blue hover:underline">
              Forgot password?
            </Link>
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? "Logging in…" : "Login"}
            </button>
          </div>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        New customer?{" "}
        <Link href="/register" className="font-medium text-pe-blue hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
