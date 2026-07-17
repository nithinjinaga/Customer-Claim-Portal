"use client";

import { Suspense } from "react";
import Image from "next/image";
import LoginForm from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <Image src="/logo.png" alt="Premier Energies" width={170} height={46} />
      <h1 className="mt-6 text-2xl font-bold">Staff login</h1>
      <p className="mt-1 text-sm text-muted">
        After-sales team access only. Customers should use the{" "}
        <a href="/login" className="font-medium text-pe-blue hover:underline">
          customer login
        </a>
        .
      </p>
      <Suspense>
        <LoginForm staff />
      </Suspense>
    </main>
  );
}
