'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Helper to generate a 10-character code in "xxx-xxxx-xxx" format
function generateMeetingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

/**
 * Creates an instant meeting/webinar/masterclass session.
 */
export async function createMeeting(data: {
  title: string;
  description?: string;
  type?: string; // "meeting" | "webinar" | "masterclass"
  visibility?: string; // "public" | "private"
  toleeId?: string; // Optional association with a Tolee group
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if toleeId is provided and if user is owner/member
    if (data.toleeId) {
      const tolee = await prisma.tolee.findUnique({
        where: { id: data.toleeId }
      });
      if (!tolee) {
        return { success: false, error: 'Tolee group not found' };
      }
      // Check if user is an approved member of this Tolee
      const membership = await prisma.toleeMember.findUnique({
        where: {
          userId_toleeId: {
            userId,
            toleeId: data.toleeId
          }
        }
      });
      if (!membership || membership.status !== 'approved') {
        return { success: false, error: 'You must be an approved member to start a meeting in this group' };
      }
    }

    let meetingCode = generateMeetingCode();
    // Ensure uniqueness
    let exists = await prisma.meeting.findUnique({ where: { meetingCode } });
    let attempts = 0;
    while (exists && attempts < 5) {
      meetingCode = generateMeetingCode();
      exists = await prisma.meeting.findUnique({ where: { meetingCode } });
      attempts++;
    }

    const meeting = await prisma.meeting.create({
      data: {
        meetingCode,
        title: data.title || 'Interactive Meeting',
        description: data.description || null,
        hostId: userId,
        toleeId: data.toleeId || null,
        type: data.type || 'meeting',
        visibility: data.visibility || 'public',
        startedAt: new Date(),
        waitingRoomEnabled: data.visibility === 'private'
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        }
      }
    });

    // Auto-join host as a participant with role "host"
    await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId,
        role: 'host',
        joinedAt: new Date()
      }
    });

    return { success: true, meeting };
  } catch (error) {
    console.error('Error creating meeting:', error);
    return { success: false, error: 'Failed to create meeting' };
  }
}

/**
 * Retrieves details of a meeting by its unique meeting code.
 */
export async function getMeetingDetails(meetingCode: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    const meeting = await prisma.meeting.findUnique({
      where: { meetingCode },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        },
        tolee: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    if (meeting.endedAt) {
      return { success: false, error: 'This meeting has already ended', meeting };
    }

    // Check permissions if private
    if (meeting.visibility === 'private' && meeting.hostId !== currentUserId) {
      // Check if user is in participants list already
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_userId: {
            meetingId: meeting.id,
            userId: currentUserId
          }
        }
      });
      // If not participant and not host, they need waiting room approval
      if (!participant || participant.leftAt !== null) {
        return { success: true, needsApproval: true, meeting };
      }
    }

    return { success: true, meeting };
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    return { success: false, error: 'Failed to fetch meeting details' };
  }
}

/**
 * Schedules a future meeting for a Tolee group.
 */
export async function scheduleMeeting(data: {
  title: string;
  description?: string;
  type: string;
  visibility: string;
  toleeId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: data.toleeId }
    });
    if (!tolee) {
      return { success: false, error: 'Tolee not found' };
    }
    if (tolee.ownerId !== userId) {
      return { success: false, error: 'Only group owners can schedule meetings' };
    }

    let meetingCode = generateMeetingCode();
    let exists = await prisma.meeting.findUnique({ where: { meetingCode } });
    while (exists) {
      meetingCode = generateMeetingCode();
      exists = await prisma.meeting.findUnique({ where: { meetingCode } });
    }

    const meeting = await prisma.meeting.create({
      data: {
        meetingCode,
        title: data.title,
        description: data.description || null,
        hostId: userId,
        toleeId: data.toleeId,
        type: data.type,
        visibility: data.visibility,
        scheduledStart: new Date(data.scheduledStart),
        scheduledEnd: new Date(data.scheduledEnd),
        waitingRoomEnabled: data.visibility === 'private'
      }
    });

    revalidatePath(`/t/${tolee.slug}`);
    return { success: true, meeting };
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return { success: false, error: 'Failed to schedule meeting' };
  }
}

/**
 * Locks, unlocks, or ends a meeting session.
 */
export async function updateMeetingStatus(meetingId: string, action: 'lock' | 'unlock' | 'end') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });
    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    // Check host/cohost status
    const participant = await prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId,
          userId
        }
      }
    });

    const isHostOrCohost = meeting.hostId === userId || (participant && (participant.role === 'host' || participant.role === 'cohost'));
    if (!isHostOrCohost) {
      return { success: false, error: 'Only the host or co-host can perform this action' };
    }

    if (action === 'lock') {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { isLocked: true }
      });
    } else if (action === 'unlock') {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { isLocked: false }
      });
    } else if (action === 'end') {
      await prisma.$transaction([
        prisma.meeting.update({
          where: { id: meetingId },
          data: { endedAt: new Date() }
        }),
        prisma.meetingParticipant.updateMany({
          where: { meetingId, leftAt: null },
          data: { leftAt: new Date() }
        })
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating meeting status:', error);
    return { success: false, error: 'Failed to update meeting status' };
  }
}

/**
 * Creates a meeting poll.
 */
export async function createMeetingPoll(meetingId: string, question: string, options: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) return { success: false, error: 'Meeting not found' };

    const poll = await prisma.meetingPoll.create({
      data: {
        meetingId,
        creatorId: userId,
        question,
        options: JSON.stringify(options),
        results: JSON.stringify(options.map(() => [])),
        status: 'active'
      }
    });

    return { success: true, poll };
  } catch (error) {
    console.error('Error creating poll:', error);
    return { success: false, error: 'Failed to create poll' };
  }
}

/**
 * Submits a vote in a meeting poll.
 */
export async function voteMeetingPoll(pollId: string, optionIndex: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const poll = await prisma.meetingPoll.findUnique({ where: { id: pollId } });
    if (!poll) return { success: false, error: 'Poll not found' };

    const options = JSON.parse(poll.options);
    let results = JSON.parse(poll.results) as string[][];

    // Remove user's previous vote if any
    results = results.map(arr => arr.filter(id => id !== userId));
    // Add vote to new option
    if (results[optionIndex]) {
      results[optionIndex].push(userId);
    }

    const updatedPoll = await prisma.meetingPoll.update({
      where: { id: pollId },
      data: {
        results: JSON.stringify(results)
      }
    });

    return { success: true, poll: updatedPoll };
  } catch (error) {
    console.error('Error voting in poll:', error);
    return { success: false, error: 'Failed to record vote' };
  }
}

/**
 * Submits a question in the Q&A section.
 */
export async function submitMeetingQuestion(meetingId: string, question: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const qa = await prisma.meetingQA.create({
      data: {
        meetingId,
        userId,
        question,
        status: 'unanswered'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return { success: true, qa };
  } catch (error) {
    console.error('Error submitting question:', error);
    return { success: false, error: 'Failed to submit question' };
  }
}

/**
 * Answers a Q&A question (host/co-host only).
 */
export async function answerMeetingQuestion(questionId: string, answer: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const qa = await prisma.meetingQA.findUnique({
      where: { id: questionId },
      include: { meeting: true }
    });
    if (!qa) return { success: false, error: 'Question not found' };

    if (qa.meeting.hostId !== userId) {
      return { success: false, error: 'Only the host can answer questions' };
    }

    const updated = await prisma.meetingQA.update({
      where: { id: questionId },
      data: {
        answer,
        status: answer ? 'answered' : 'unanswered'
      }
    });

    return { success: true, qa: updated };
  } catch (error) {
    console.error('Error answering question:', error);
    return { success: false, error: 'Failed to answer question' };
  }
}

/**
 * Pins/unpins a Q&A question (host/co-host only).
 */
export async function pinMeetingQuestion(questionId: string, isPinned: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const qa = await prisma.meetingQA.findUnique({
      where: { id: questionId },
      include: { meeting: true }
    });
    if (!qa) return { success: false, error: 'Question not found' };

    if (qa.meeting.hostId !== userId) {
      return { success: false, error: 'Only the host can pin questions' };
    }

    const updated = await prisma.meetingQA.update({
      where: { id: questionId },
      data: { isPinned }
    });

    return { success: true, qa: updated };
  } catch (error) {
    console.error('Error pinning question:', error);
    return { success: false, error: 'Failed to pin question' };
  }
}

/**
 * Gets all polls for a meeting.
 */
export async function getMeetingPolls(meetingId: string) {
  try {
    const polls = await prisma.meetingPoll.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, polls };
  } catch (error) {
    console.error('Error fetching polls:', error);
    return { success: false, polls: [] };
  }
}

/**
 * Gets all Q&A questions for a meeting.
 */
export async function getMeetingQuestions(meetingId: string) {
  try {
    const questions = await prisma.meetingQA.findMany({
      where: { meetingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return { success: true, questions };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return { success: false, questions: [] };
  }
}

/**
 * Gets all active/live meetings for a Tolee group.
 */
export async function getToleeMeetings(toleeId: string) {
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        toleeId,
        endedAt: null
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, meetings };
  } catch (error) {
    console.error('Error fetching Tolee meetings:', error);
    return { success: false, meetings: [] };
  }
}

/**
 * Generates an AI meeting summary and action items list.
 */
export async function generateMeetingSummary(meetingId: string, customTranscriptText?: string) {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        qaList: true,
        polls: true
      }
    });

    if (!meeting) return { success: false, error: 'Meeting not found' };

    // Compile fallback transcript from Q&A and Polls if no live text is provided
    let transcriptText = customTranscriptText || '';
    if (!transcriptText) {
      const qText = meeting.qaList.map(q => `Question: ${q.question}\nAnswer: ${q.answer || 'Unanswered'}`).join('\n\n');
      const pText = meeting.polls.map(p => `Poll: ${p.question}\nResults: ${p.results}`).join('\n\n');
      transcriptText = `--- MEETING Q&A SUMMARY ---\n${qText}\n\n--- MEETING POLLS SUMMARY ---\n${pText}`;
    }

    const apiKey = process.env.NVIDIA_API_KEY || '';
    let summary = "The meeting focused on the planned agenda. Interactive Q&As were held, and students raised query points which were resolved by the host.";
    let actionItems = ["Review slides", "Submit assignment"];

    if (apiKey) {
      try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-405b-instruct",
            messages: [
              {
                role: "system",
                content: "You are the Tolee AI Meeting Assistant. Compile this meeting transcript into a structured JSON with: 'summary' (2-3 sentences string) and 'actionItems' (string array of action items)."
              },
              {
                role: "user",
                content: `Here is the transcript and meeting logs:\n\n${transcriptText}`
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = JSON.parse(resJson.choices[0].message.content);
          summary = content.summary || summary;
          actionItems = content.actionItems || actionItems;
        }
      } catch (aiErr) {
        console.error('AI Summarizer Error, falling back to template:', aiErr);
      }
    }

    const notes = await prisma.meetingNotes.upsert({
      where: { meetingId },
      update: {
        summary,
        actionItems: JSON.stringify(actionItems),
        transcript: transcriptText
      },
      create: {
        meetingId,
        summary,
        actionItems: JSON.stringify(actionItems),
        transcript: transcriptText
      }
    });

    return { success: true, notes };
  } catch (error) {
    console.error('Error generating meeting summary:', error);
    return { success: false, error: 'Failed to generate summary' };
  }
}

