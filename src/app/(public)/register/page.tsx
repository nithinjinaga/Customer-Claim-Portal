"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerSchema } from "@/lib/validation";
import { registerAction } from "../actions";
import { Field, inputCls, btnGreen, Card, Alert } from "@/components/ui";

type FormValues = z.input<typeof registerSchema>;

const CUSTOMER_TYPES = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
  ["EPC", "EPC"],
  ["CHANNEL_PARTNER", "Channel Partner"],
] as const;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { customerType: "RESIDENTIAL" },
  });

  async function onPincodeChange(pin: string) {
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = await res.json();
      const po = json?.[0]?.PostOffice?.[0];
      if (po) {
        setValue("state", po.State, { shouldValidate: true });
        setValue("district", po.District, { shouldValidate: true });
        setValue("city", po.Block && po.Block !== "NA" ? po.Block : po.District, {
          shouldValidate: true,
        });
      }
    } catch {
      // offline or API down — user fills fields manually
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    setServerError(undefined);
    const res = await registerAction(data);
    if (res?.error) {
      setServerError(res.error);
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Register once, then raise and track complaints for all your Premier
        Energies installations.
      </p>

      <Card className="mt-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {serverError && (
            <div className="sm:col-span-2">
              <Alert kind="error">{serverError}</Alert>
            </div>
          )}

          <Field label="Full Name" required error={errors.name?.message}>
            <input className={inputCls} autoComplete="name" {...register("name")} />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <input className={inputCls} type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field
            label="Mobile Number"
            required
            error={errors.phone?.message}
            hint="10-digit Indian number, +91 optional"
          >
            <input className={inputCls} type="tel" inputMode="tel" placeholder="+91 98XXXXXXXX" {...register("phone")} />
          </Field>
          <Field label="Alternate Number" error={errors.altPhone?.message}>
            <input className={inputCls} type="tel" inputMode="tel" {...register("altPhone")} />
          </Field>
          <Field label="Company / Organization" error={errors.company?.message} hint="For B2B customers">
            <input className={inputCls} autoComplete="organization" {...register("company")} />
          </Field>
          <Field label="Customer Type" required error={errors.customerType?.message}>
            <select className={inputCls} {...register("customerType")}>
              {CUSTOMER_TYPES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2 mt-2 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-pe-navy">Address</h2>
          </div>

          <Field label="House / Flat No." required error={errors.houseNo?.message}>
            <input className={inputCls} {...register("houseNo")} />
          </Field>
          <Field label="Street / Locality" required error={errors.street?.message}>
            <input className={inputCls} {...register("street")} />
          </Field>
          <Field label="Pincode" required error={errors.pincode?.message} hint="State & district auto-fill">
            <input
              className={`${inputCls} tnum`}
              inputMode="numeric"
              maxLength={6}
              {...register("pincode", { onChange: (e) => onPincodeChange(e.target.value) })}
            />
          </Field>
          <Field label="State" required error={errors.state?.message}>
            <input className={inputCls} {...register("state")} />
          </Field>
          <Field label="District" required error={errors.district?.message}>
            <input className={inputCls} {...register("district")} />
          </Field>
          <Field label="City / Town" required error={errors.city?.message}>
            <input className={inputCls} {...register("city")} />
          </Field>

          <div className="sm:col-span-2 mt-2 border-t border-line pt-4">
            <h2 className="text-sm font-semibold text-pe-navy">Security</h2>
          </div>

          <Field
            label="Password"
            required
            error={errors.password?.message}
            hint="Min 8 chars, 1 uppercase, 1 number"
          >
            <input className={inputCls} type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field label="Confirm Password" required error={errors.confirmPassword?.message}>
            <input className={inputCls} type="password" autoComplete="new-password" {...register("confirmPassword")} />
          </Field>

          <div className="sm:col-span-2 mt-2 flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-pe-blue hover:underline">
                Login
              </Link>
            </p>
            <button type="submit" disabled={submitting} className={btnGreen}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
