import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMeetingDetails } from '@/actions/meeting';
import { prisma } from '@/lib/prisma';
import MeetingClientWrapper from './MeetingClientWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Interactive Room',
  description: 'Google Meet style multi-party video conferencing, webinars, and masterclasses.',
};

interface PageProps {
  params: {
    code: string;
  };
}

export default async function MeetingPage({ params }: PageProps) {
  // Defensive checks on params and meeting code
  if (!params?.code || typeof params.code !== 'string' || params.code.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Invalid Meeting</h1>
          <p className="text-zinc-400 text-sm mb-6">
            The meeting code provided is invalid or missing.
          </p>
          <a
            href="/"
            className="inline-block w-full py-3 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl transition-all"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/live/meeting/${params.code}`);
  }

  const currentUser = {
    id: (session.user as any).id,
    name: session.user.name || 'Tolee User',
    avatar: session.user.image || '/default-user-avatar.svg',
    username: (session.user as any).username || 'toleeuser',
  };

  const res = await getMeetingDetails(params.code);

  if (!res.success) {
    if (res.error === 'JOIN_GROUP_FIRST') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/20">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-teal-400">Join Group First</h1>
              <p className="text-zinc-400 text-sm">
                You must be an approved member of <span className="font-bold text-white">{res.tolee?.name}</span> to join this live meeting.
              </p>
            </div>
            <a
              href={`/t/${res.tolee?.slug}`}
              className="inline-block w-full py-3 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl transition-all text-sm"
            >
              Go to Group Page
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Meeting Not Available</h1>
          <p className="text-zinc-400 text-sm mb-6">
            {res.error || 'The meeting link you followed is invalid or has expired.'}
          </p>
          <a
            href="/"
            className="inline-block w-full py-3 bg-[#0a7c85] hover:bg-[#0a7c85]/90 text-white font-bold rounded-xl transition-all"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const meeting = JSON.parse(JSON.stringify(res.meeting));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <ErrorBoundary>
        <MeetingClientWrapper
          meetingCode={params.code}
          initialMeeting={meeting!}
          currentUser={currentUser}
          initialNeedsApproval={!!res.needsApproval}
        />
      </ErrorBoundary>
    </div>
  );
}
