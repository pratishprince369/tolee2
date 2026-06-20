'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, UserCheck, UserX, BarChart3, HelpCircle, 
  MessageSquare, Users, Pin, CheckCircle2, Lock, Plus, Trash,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Socket } from 'socket.io-client';
import { 
  createMeetingPoll, 
  voteMeetingPoll, 
  submitMeetingQuestion, 
  answerMeetingQuestion, 
  pinMeetingQuestion,
  getMeetingPolls,
  getMeetingQuestions,
  sendMeetingInvitationToAllMembers
} from '@/actions/meeting';

interface MeetingSidebarProps {
  meeting: any;
  meetingId: string;
  currentUser: any;
  activeTab: 'chat' | 'people' | 'polls' | 'qa';
  onClose: () => void;
  socket?: Socket | null;
}

export default function MeetingSidebar({
  meeting,
  meetingId,
  currentUser,
  activeTab,
  onClose,
  socket
}: MeetingSidebarProps) {
  const isHost = meeting?.hostId === currentUser?.id;
  const [sendingInvites, setSendingInvites] = useState(false);
  const [invitesSent, setInvitesSent] = useState(false);

  const handleSendInvitations = async () => {
    setSendingInvites(true);
    try {
      const res = await sendMeetingInvitationToAllMembers(meetingId);
      if (res.success) {
        setInvitesSent(true);
        alert(`🔔 Invitations sent to all ${res.count} members of the group!`);
      } else {
        alert("Failed to send invitations: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while sending invitations.");
    } finally {
      setSendingInvites(false);
    }
  };

  // Tabs states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');
  
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  
  // Polls States
  const [polls, setPolls] = useState<any[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [showPollCreator, setShowPollCreator] = useState(false);

  // Q&A States
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [activeAnswerId, setActiveAnswerId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Load for Polls & Q&A
  useEffect(() => {
    async function loadData() {
      const pollsRes = await getMeetingPolls(meetingId);
      if (pollsRes.success) setPolls(pollsRes.polls);

      const qaRes = await getMeetingQuestions(meetingId);
      if (qaRes.success) setQuestions(qaRes.questions);
    }
    loadData();
  }, [meetingId]);

  // 2. Real-time Socket.IO Listeners
  useEffect(() => {
    if (!socket) return;

    // Chat Message listener
    socket.on('meeting-chat-message', (msg: any) => {
      setChatMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    // Join Request listener (Only for hosts)
    if (isHost) {
      socket.on('meeting-join-request', (req: any) => {
        setJoinRequests(prev => {
          if (prev.some(r => r.userId === req.userId)) return prev;
          return [...prev, req];
        });
      });
    }

    // Poll listener
    socket.on('meeting-poll-updated', (updatedPoll: any) => {
      setPolls(prev => {
        const index = prev.findIndex(p => p.id === updatedPoll.id);
        if (index === -1) return [updatedPoll, ...prev];
        const copy = [...prev];
        copy[index] = updatedPoll;
        return copy;
      });
    });

    // Q&A listener
    socket.on('meeting-qa-updated', (updatedQa: any) => {
      setQuestions(prev => {
        const index = prev.findIndex(q => q.id === updatedQa.id);
        if (index === -1) return [updatedQa, ...prev];
        const copy = [...prev];
        copy[index] = updatedQa;
        // Sort questions (pinned first, then newest)
        return copy.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
    });

    return () => {
      socket.off('meeting-chat-message');
      socket.off('meeting-join-request');
      socket.off('meeting-poll-updated');
      socket.off('meeting-qa-updated');
    };
  }, [socket, isHost]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 3. Send Chat Message
  const handleSendChat = () => {
    if (!chatText.trim() || !socket) return;

    const messagePayload = {
      meetingCode: meeting.meetingCode,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: chatText.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('meeting-chat-message', messagePayload);
    setChatText('');
  };

  // 4. Resolve Join Request (Approve/Reject)
  const handleResolveJoin = (reqUserId: string, approved: boolean) => {
    if (!socket) return;
    
    socket.emit('meeting-join-response', {
      meetingCode: meeting.meetingCode,
      userId: reqUserId,
      approved
    });

    setJoinRequests(prev => prev.filter(r => r.userId !== reqUserId));
  };

  // 5. Create Poll
  const handleCreatePoll = async () => {
    const validOptions = newPollOptions.filter(opt => opt.trim() !== '');
    if (!newPollQuestion.trim() || validOptions.length < 2) return;

    const res = await createMeetingPoll(meetingId, newPollQuestion.trim(), validOptions);
    if (res.success && socket) {
      socket.emit('meeting-poll-created', {
        meetingCode: meeting.meetingCode,
        poll: res.poll
      });
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      setShowPollCreator(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    const res = await voteMeetingPoll(pollId, optionIndex);
    if (res.success && socket) {
      socket.emit('meeting-poll-vote', {
        meetingCode: meeting.meetingCode,
        poll: res.poll
      });
    }
  };

  // 6. Submit Q&A
  const handleSubmitQuestion = async () => {
    if (!newQuestionText.trim()) return;

    const res = await submitMeetingQuestion(meetingId, newQuestionText.trim());
    if (res.success && socket) {
      socket.emit('meeting-qa-created', {
        meetingCode: meeting.meetingCode,
        qa: res.qa
      });
      setNewQuestionText('');
    }
  };

  const handleAnswerQuestion = async (qaId: string) => {
    if (!answerText.trim()) return;

    const res = await answerMeetingQuestion(qaId, answerText.trim());
    if (res.success && socket) {
      socket.emit('meeting-qa-action', {
        meetingCode: meeting.meetingCode,
        qa: res.qa
      });
      setActiveAnswerId(null);
      setAnswerText('');
    }
  };

  const handlePinQuestion = async (qaId: string, currentPinState: boolean) => {
    const res = await pinMeetingQuestion(qaId, !currentPinState);
    if (res.success && socket) {
      socket.emit('meeting-qa-action', {
        meetingCode: meeting.meetingCode,
        qa: res.qa
      });
    }
  };

  return (
    <div className="w-[360px] bg-zinc-900 border-l border-zinc-800 flex flex-col h-full z-20 text-white select-none">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-zinc-300">
          {activeTab === 'chat' && <><MessageSquare className="w-4 h-4 text-teal-400" /> Chat</>}
          {activeTab === 'people' && <><Users className="w-4 h-4 text-teal-400" /> People</>}
          {activeTab === 'polls' && <><BarChart3 className="w-4 h-4 text-teal-400" /> Polls</>}
          {activeTab === 'qa' && <><HelpCircle className="w-4 h-4 text-teal-400" /> Q&A</>}
        </h3>
        <Button size="icon" variant="ghost" onClick={onClose} className="rounded-full text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Sidebar Content Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* -------------------------------------------------- */}
        {/* CHAT TAB */}
        {/* -------------------------------------------------- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-grow space-y-4 overflow-y-auto max-h-[calc(100vh-230px)] pr-1 hide-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Welcome to meeting chat! Messages will appear in real-time.
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={msg.senderAvatar} />
                      <AvatarFallback className="text-[10px] bg-zinc-800 font-bold text-teal-400">{msg.senderName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-zinc-300">{msg.senderName}</span>
                        <span className="text-[8px] text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 break-all whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="pt-4 border-t border-zinc-800/80 flex gap-2">
              <Input
                placeholder="Send a message to everyone..."
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="bg-zinc-950 border-zinc-800 text-xs rounded-xl focus-visible:ring-teal-500 focus-visible:ring-1"
              />
              <Button size="icon" onClick={handleSendChat} className="bg-[#0a7c85] hover:bg-[#0a7c85]/90 rounded-xl">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* PEOPLE TAB (Waiting Room + Active List) */}
        {/* -------------------------------------------------- */}
        {activeTab === 'people' && (
          <div className="space-y-6">
            
            {/* Host Only Waiting Room */}
            {isHost && joinRequests.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Waiting Room ({joinRequests.length})
                </h4>
                <div className="space-y-2">
                  {joinRequests.map(req => (
                    <div key={req.userId} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={req.avatar} />
                          <AvatarFallback className="text-xs bg-zinc-800">{req.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{req.name}</p>
                          <p className="text-[10px] text-zinc-500">Wants to enter</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button 
                          size="icon" 
                          onClick={() => handleResolveJoin(req.userId, true)}
                          className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive"
                          onClick={() => handleResolveJoin(req.userId, false)}
                          className="w-7 h-7 rounded-lg text-white"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-[1px] bg-zinc-800 my-4" />
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Meeting Details
              </h4>
              <div className="space-y-2 bg-zinc-950/40 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Host: <span className="font-semibold text-zinc-200">{meeting?.host?.name ?? 'Unknown'}</span>
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                  Type: <span className="font-semibold text-teal-400 uppercase">{meeting?.type ?? 'MEETING'}</span>
                </p>
              </div>

              {isHost && meeting?.toleeId && (
                <Button
                  onClick={handleSendInvitations}
                  disabled={sendingInvites || invitesSent}
                  className={`w-full py-4 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all mt-2 ${
                    invitesSent 
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-850 cursor-default' 
                      : 'bg-indigo-650 hover:bg-indigo-750 text-white shadow-md'
                  }`}
                >
                  {sendingInvites ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : invitesSent ? (
                    <>
                      🔔 Invitations Sent! ✓
                    </>
                  ) : (
                    <>
                      🔔 Send Invitation to All Members
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* POLLS TAB */}
        {/* -------------------------------------------------- */}
        {activeTab === 'polls' && (
          <div className="space-y-4">
            
            {isHost && !showPollCreator && (
              <Button
                onClick={() => setShowPollCreator(true)}
                className="w-full bg-[#0a7c85] hover:bg-[#0a7c85]/90 font-bold rounded-xl flex items-center justify-center gap-1.5 py-5"
              >
                <Plus className="w-4 h-4" /> Create New Poll
              </Button>
            )}

            {showPollCreator && (
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Question</label>
                  <Input 
                    placeholder="e.g. Which topic to study next?"
                    value={newPollQuestion}
                    onChange={e => setNewPollQuestion(e.target.value)}
                    className="bg-zinc-900 border-zinc-850 text-xs rounded-xl focus-visible:ring-1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Options</label>
                  {newPollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const copy = [...newPollOptions];
                          copy[idx] = e.target.value;
                          setNewPollOptions(copy);
                        }}
                        className="bg-zinc-900 border-zinc-850 text-xs rounded-xl focus-visible:ring-1"
                      />
                      {newPollOptions.length > 2 && (
                        <button
                          onClick={() => setNewPollOptions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-500 hover:text-red-500"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewPollOptions(prev => [...prev, ''])}
                    className="text-xs text-teal-400 font-bold flex items-center gap-1 hover:text-teal-300 mt-1"
                  >
                    + Add option
                  </button>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowPollCreator(false)} className="flex-1 rounded-xl">Cancel</Button>
                  <Button size="sm" onClick={handleCreatePoll} className="flex-1 bg-[#0a7c85] rounded-xl font-bold">Launch</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {polls.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No polls active in this session.
                </div>
              ) : (
                polls.map(poll => {
                  const options = JSON.parse(poll.options) as string[];
                  const results = JSON.parse(poll.results) as string[][];
                  const totalVotes = results.reduce((acc, curr) => acc + curr.length, 0);

                  return (
                    <div key={poll.id} className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200">{poll.question}</h4>
                      
                      <div className="space-y-2">
                        {options.map((option, idx) => {
                          const votes = results[idx]?.length || 0;
                          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          const hasVoted = results[idx]?.includes(currentUser.id);

                          return (
                            <button
                              key={idx}
                              onClick={() => handleVotePoll(poll.id, idx)}
                              className="w-full text-left relative overflow-hidden rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 p-3 flex justify-between items-center group transition-all"
                            >
                              {/* Background vote progress bar overlay */}
                              <div 
                                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${hasVoted ? 'bg-teal-500/15' : 'bg-zinc-800/30'}`}
                                style={{ width: `${percent}%` }}
                              />

                              <span className={`text-xs z-10 flex items-center gap-1.5 ${hasVoted ? 'text-teal-400 font-bold' : 'text-zinc-400'}`}>
                                {option}
                                {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 fill-teal-500 text-black" />}
                              </span>
                              
                              <span className="text-[10px] font-semibold z-10 text-zinc-500 group-hover:text-zinc-400">
                                {votes} votes ({percent}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-zinc-500 font-semibold px-1">
                        <span>Status: <span className="text-teal-400">ACTIVE</span></span>
                        <span>Total votes: {totalVotes}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* Q&A TAB */}
        {/* -------------------------------------------------- */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ask a question</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask the speaker something..."
                  value={newQuestionText}
                  onChange={e => setNewQuestionText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitQuestion()}
                  className="bg-zinc-900 border-zinc-850 text-xs rounded-xl focus-visible:ring-1"
                />
                <Button onClick={handleSubmitQuestion} className="bg-[#0a7c85] hover:bg-[#0a7c85]/90 rounded-xl px-4 font-bold text-xs">
                  Ask
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {questions.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No questions asked yet. Be the first to ask!
                </div>
              ) : (
                questions.map(q => (
                  <div key={q.id} className={`border rounded-2xl p-4 space-y-3 transition-colors ${
                    q.isPinned ? 'bg-teal-500/5 border-teal-500/20' : 'bg-zinc-950/40 border-zinc-800/80'
                  }`}>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={q.user.avatar} />
                          <AvatarFallback className="text-[9px] bg-zinc-800">{q.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-300">{q.user.name}</p>
                          <p className="text-[8px] text-zinc-500">
                            {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      {isHost && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePinQuestion(q.id, q.isPinned)}
                            className={`w-7 h-7 rounded-lg ${q.isPinned ? 'text-teal-400 bg-teal-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-zinc-200 leading-relaxed pr-2">{q.question}</p>

                    {/* Render Answer Section */}
                    {q.answer ? (
                      <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-850/50">
                        <p className="text-[9px] text-teal-400 font-bold uppercase tracking-wider">Answer from Host</p>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{q.answer}</p>
                      </div>
                    ) : (
                      isHost && activeAnswerId !== q.id && (
                        <button
                          onClick={() => {
                            setActiveAnswerId(q.id);
                            setAnswerText('');
                          }}
                          className="text-xs text-teal-400 font-bold hover:text-teal-300 flex items-center gap-1"
                        >
                          + Write Answer
                        </button>
                      )
                    )}

                    {/* Host Active Answer Input Box */}
                    {isHost && activeAnswerId === q.id && (
                      <div className="space-y-2 pt-1.5">
                        <Input
                          placeholder="Type answer here..."
                          value={answerText}
                          onChange={e => setAnswerText(e.target.value)}
                          className="bg-zinc-900 border-zinc-850 text-xs rounded-xl focus-visible:ring-1"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setActiveAnswerId(null)} className="rounded-xl flex-1 text-xs">Cancel</Button>
                          <Button size="sm" onClick={() => handleAnswerQuestion(q.id)} className="bg-[#0a7c85] rounded-xl flex-1 font-bold text-xs">Submit</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
