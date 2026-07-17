"use client";

import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Login</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-muted">
        New customer?{" "}
        <Link href="/register" className="font-medium text-pe-blue hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
