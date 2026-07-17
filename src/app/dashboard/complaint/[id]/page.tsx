import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ComplaintDetail from "@/components/ComplaintDetail";

export const dynamic = "force-dynamic";

export default async function ComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const complaint = await db.complaint.findUnique({
    where: { complaintId: id.toUpperCase() },
    include: {
      attachments: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint || complaint.userId !== session.sub) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm font-medium text-pe-blue hover:underline">
        ← Back to dashboard
      </Link>
      <div className="mt-4">
        <ComplaintDetail complaint={complaint} />
      </div>
    </div>
  );
}
