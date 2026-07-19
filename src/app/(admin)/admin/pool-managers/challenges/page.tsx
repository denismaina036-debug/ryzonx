import Link from "next/link";
import { AdminChallengeEnrollments } from "@/features/admin/components/admin-challenge-enrollments";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { challengeService } from "@/services/challenge.service";
import { challengeCenterService } from "@/services/challenge-center.service";
import { adminChallengeReviewPath } from "@/constants/routes";

export default async function AdminPoolManagersChallengesPage() {
  const [enrollments, challengeEnrollments] = await Promise.all([
    challengeService.getAdminEnrollments(),
    challengeCenterService.listActiveEnrollmentsForAdmin(),
  ]);

  return (
    <AdminPoolManagersShell
      title="Trader Challenge"
      description="Manage challenge enrollments, review submitted trades, and mark outcomes."
    >
      {challengeEnrollments.length > 0 && (
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-semibold text-navy-900">Pool Manager Challenge Reviews</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {challengeEnrollments.map((item) => (
              <Link
                key={item.enrollmentId}
                href={adminChallengeReviewPath(item.enrollmentId)}
                className="rounded-xl border border-navy-100 bg-white p-4 transition hover:border-royal-300"
              >
                <p className="font-medium text-navy-900">{item.applicantName}</p>
                <p className="mt-1 text-xs capitalize text-navy-500">{item.status}</p>
                {item.tradesPending > 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    {item.tradesPending} trade(s) pending review
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <AdminChallengeEnrollments enrollments={enrollments} />
    </AdminPoolManagersShell>
  );
}
