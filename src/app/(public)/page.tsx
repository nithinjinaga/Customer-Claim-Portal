import Link from "next/link";
import { btnGreen, btnGhost, Card, inputCls, btnPrimary } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-pe-green-dark">
            Premier Energies After-Sales
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Customer Service Portal
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Report a defect in your Premier Energies solar modules — technical
            faults or transit breakage — and track its resolution from
            submission to closure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={btnGreen}>
              Register
            </Link>
            <Link href="/login" className={btnGhost}>
              Already registered? Login
            </Link>
          </div>
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Check complaint status</h2>
          <p className="mt-1 text-sm text-muted">
            No login needed — enter the Complaint ID from your confirmation
            email.
          </p>
          <form action="/track" className="mt-4 flex gap-2">
            <input
              name="id"
              required
              placeholder="e.g. PE1707202601"
              className={`${inputCls} tnum uppercase`}
              aria-label="Complaint ID"
            />
            <button type="submit" className={btnPrimary}>
              Track
            </button>
          </form>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [
            "Structured reporting",
            "A guided step-by-step form captures site, module, and defect details correctly the first time.",
          ],
          [
            "Evidence uploads",
            "Attach photos and videos of the defect and your invoice — straight from your phone.",
          ],
          [
            "Status you can see",
            "Every complaint gets a unique ID, a visible status timeline, and email updates at each stage.",
          ],
        ].map(([title, body]) => (
          <Card key={title}>
            <h3 className="text-sm font-semibold text-pe-navy">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
