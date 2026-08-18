'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Plus, 
  Trash2, 
  Briefcase, 
  GraduationCap, 
  Code2, 
  FolderGit2, 
  User, 
  Target, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  Save, 
  FileSpreadsheet, 
  Printer, 
  Copy, 
  Wand2, 
  Eye, 
  Database,
  Layers,
  Check
} from 'lucide-react';
import { 
  ResumeData, 
  generateAISummary, 
  enhanceBulletPoint, 
  analyzeJobDescriptionMatch, 
  saveUserResume 
} from '@/actions/resumeBuilder';

const INITIAL_RESUME: ResumeData = {
  title: 'Senior Software Engineer Resume',
  targetRole: 'Full Stack Software Engineer',
  template: 'modern',
  personalInfo: {
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    linkedinUrl: 'https://linkedin.com/in/aarav-sharma',
    githubUrl: 'https://github.com/aaravsharma',
    portfolioUrl: 'https://aaravsharma.dev'
  },
  summary: 'Versatile Full Stack Software Engineer with 5+ years of experience architecting high-scale distributed systems and cloud applications. Expert in Next.js, Node.js, TypeScript, PostgreSQL, and scalable microservices. Proven track record of improving system uptime to 99.98% and boosting user engagement through responsive, performance-driven web products.',
  experiences: [
    {
      id: 'exp-1',
      company: 'Miracle Tech Solutions',
      role: 'Senior Full Stack Engineer',
      location: 'Bengaluru, India',
      startDate: '2023-01',
      endDate: 'Present',
      isCurrent: true,
      description: '• Architected and deployed microservices handling 2M+ monthly active requests with 35% reduced latency.\n• Led a squad of 6 engineers migrating legacy monolithic infrastructure to Next.js 14 and Neon serverless databases.\n• Integrated automated CI/CD workflows and automated end-to-end testing, reducing deployment bugs by 40%.'
    },
    {
      id: 'exp-2',
      company: 'HyperGrowth Systems',
      role: 'Software Development Engineer II',
      location: 'Mumbai, India',
      startDate: '2021-04',
      endDate: '2022-12',
      isCurrent: false,
      description: '• Developed real-time collaborative chat and analytics dashboards utilizing WebSockets and Redis pub/sub.\n• Optimized SQL queries and database indexes, reducing median query execution time from 420ms to 45ms.\n• Spearheaded OAuth2 and JWT role-based access control authentication protecting 100K+ enterprise accounts.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Indian Institute of Technology (IIT) Delhi',
      degree: 'Bachelor of Technology (B.Tech)',
      fieldOfStudy: 'Computer Science & Engineering',
      startDate: '2017',
      endDate: '2021',
      grade: '8.9 / 10 CGPA'
    }
  ],
  skills: [
    { category: 'Languages & Core', items: ['TypeScript', 'JavaScript (ES6+)', 'Python', 'SQL', 'HTML5/CSS3'] },
    { category: 'Frameworks & Libraries', items: ['React.js', 'Next.js (App Router)', 'Node.js', 'Express', 'TailwindCSS', 'Redux Toolkit'] },
    { category: 'Cloud, DB & DevOps', items: ['PostgreSQL', 'Neon DB', 'Prisma ORM', 'Redis', 'Docker', 'AWS (S3, EC2)', 'Git & GitHub Actions'] }
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Real-Time Enterprise Collaboration Platform',
      technologies: 'Next.js, WebSockets, PostgreSQL, TailwindCSS',
      description: 'Engineered high-concurrency collaboration suite supporting synchronized document editing, live audio rooms, and granular role permissions.',
      link: 'https://github.com/example/collab'
    },
    {
      id: 'proj-2',
      name: 'AI Lead & Talent OSINT Engine',
      technologies: 'Node.js, Llama-3 70B, Python, REST APIs',
      description: 'Built automated talent discovery and corporate contact verification crawler with 96% email accuracy and 1-click CSV exports.',
      link: 'https://github.com/example/osint'
    }
  ],
  atsScore: 92,
  jobDescription: ''
};

export default function ResumeBuilderClient() {
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [activeTab, setActiveTab] = useState<'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'ats'>('personal');
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // ATS Scanner state
  const [targetJD, setTargetJD] = useState('');
  const [atsResult, setAtsResult] = useState<{
    score: number;
    missingKeywords: string[];
    recommendations: string[];
    summaryFeedback: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAISummaryRewrite = async () => {
    setLoadingAI(true);
    showToast('🤖 AI is writing an ATS-optimized executive summary...');
    
    const allSkills = resume.skills.flatMap(s => s.items);
    const res = await generateAISummary({
      targetRole: resume.targetRole || 'Full Stack Engineer',
      yearsOfExperience: '5+ years',
      skills: allSkills,
      currentSummary: resume.summary,
    });

    if (res.success && res.summary) {
      setResume(prev => ({ ...prev, summary: res.summary! }));
      showToast('✨ Summary enhanced with high-impact keywords!');
    }
    setLoadingAI(false);
  };

  const handleAIEnhanceExperience = async (expId: string) => {
    const targetExp = resume.experiences.find(e => e.id === expId);
    if (!targetExp || !targetExp.description.trim()) return;

    setLoadingAI(true);
    showToast('⚡ AI is adding action verbs and quantifiable metrics...');

    const res = await enhanceBulletPoint({
      rawPoint: targetExp.description,
      role: targetExp.role,
      company: targetExp.company,
    });

    if (res.success && res.enhanced) {
      setResume(prev => ({
        ...prev,
        experiences: prev.experiences.map(e => e.id === expId ? { ...e, description: res.enhanced! } : e)
      }));
      showToast('🚀 Experience bullet points upgraded with STAR methodology!');
    }
    setLoadingAI(false);
  };

  const handleScanATS = async () => {
    if (!targetJD.trim()) {
      showToast('⚠️ Please paste a target job description to scan.');
      return;
    }

    setLoadingAI(true);
    showToast('🎯 Scanning ATS keyword density and candidate match score...');

    const fullContent = `
      Title: ${resume.targetRole}
      Summary: ${resume.summary}
      Experience: ${resume.experiences.map(e => `${e.role} at ${e.company}: ${e.description}`).join('\n')}
      Skills: ${resume.skills.flatMap(s => s.items).join(', ')}
      Education: ${resume.education.map(e => `${e.degree} from ${e.institution}`).join('\n')}
    `;

    const res = await analyzeJobDescriptionMatch({
      resumeContent: fullContent,
      jobDescription: targetJD,
    });

    if (res.success) {
      setAtsResult(res);
      setResume(prev => ({ ...prev, atsScore: res.score, jobDescription: targetJD }));
      showToast(`✅ ATS Match Score Calculated: ${res.score}%`);
    }
    setLoadingAI(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveUserResume(resume);
    if (res.success) {
      if (res.id) setResume(prev => ({ ...prev, id: res.id }));
      showToast('💾 Resume saved successfully to tolee-1 database!');
    } else {
      showToast('❌ Error saving resume.');
    }
    setSaving(false);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resume, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${resume.personalInfo.fullName.replace(/\s+/g, '_')}_resume.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('📦 Resume JSON exported!');
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          {notification}
        </div>
      )}

      {/* Top Header & Action Controls */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link 
            href="/world" 
            className="p-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white hover:border-cyan-500/40 transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tolee World</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                PRO AI STUDIO
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                <Database className="w-2.5 h-2.5" /> tolee-1 DB
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              AI Resume Builder &amp; ATS Optimizer
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Template Selector */}
          <div className="flex items-center gap-1 bg-[#0b1220] border border-[#182842] rounded-xl p-1 text-xs">
            {(['modern', 'classic', 'minimal', 'executive'] as const).map(t => (
              <button
                key={t}
                onClick={() => setResume({ ...resume, template: t })}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all ${
                  resume.template === t ? 'bg-cyan-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-[#0e1c31] hover:bg-[#152a48] border border-cyan-800/50 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save to DB'}</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left = Form Editor | Right = Live Resume Canvas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN: FORM EDITOR & AI ASSISTANTS (5 COLS)
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-2xl print:hidden">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-[#142036]">
            {[
              { id: 'personal', label: 'Personal', icon: User },
              { id: 'summary', label: 'Summary', icon: Sparkles },
              { id: 'experience', label: 'Experience', icon: Briefcase },
              { id: 'education', label: 'Education', icon: GraduationCap },
              { id: 'skills', label: 'Skills', icon: Code2 },
              { id: 'projects', label: 'Projects', icon: FolderGit2 },
              { id: 'ats', label: 'ATS Match', icon: Target },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                      : 'bg-[#060c16] text-gray-400 hover:text-white border border-[#142036]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="space-y-3 text-xs animate-in fade-in">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={resume.personalInfo.fullName}
                  onChange={(e) => setResume({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, fullName: e.target.value }
                  })}
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Role / Professional Title</label>
                <input
                  type="text"
                  value={resume.targetRole}
                  onChange={(e) => setResume({ ...resume, targetRole: e.target.value })}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email ID</label>
                  <input
                    type="email"
                    value={resume.personalInfo.email}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, email: e.target.value }
                    })}
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={resume.personalInfo.phone}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, phone: e.target.value }
                    })}
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={resume.personalInfo.location}
                  onChange={(e) => setResume({
                    ...resume,
                    personalInfo: { ...resume.personalInfo, location: e.target.value }
                  })}
                  placeholder="Bengaluru, India"
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={resume.personalInfo.linkedinUrl}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, linkedinUrl: e.target.value }
                    })}
                    placeholder="linkedin.com/in/..."
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Portfolio / Website</label>
                  <input
                    type="text"
                    value={resume.personalInfo.portfolioUrl}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, portfolioUrl: e.target.value }
                    })}
                    placeholder="https://..."
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFESSIONAL SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-3 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-gray-300 font-semibold">Professional Summary (3-4 Sentences)</label>
                <button
                  type="button"
                  onClick={handleAISummaryRewrite}
                  disabled={loadingAI}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-lg transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Rewrite / Generate</span>
                </button>
              </div>

              <textarea
                value={resume.summary}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                rows={6}
                placeholder="Write or generate your executive summary highlighting your core expertise and achievements..."
                className="w-full bg-[#060c16] border border-[#182842] rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/60 leading-relaxed resize-none"
              />
            </div>
          )}

          {/* TAB 3: WORK EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold">Experience History</span>
                <button
                  type="button"
                  onClick={() => setResume({
                    ...resume,
                    experiences: [
                      ...resume.experiences,
                      {
                        id: `exp-${Date.now()}`,
                        company: 'New Company',
                        role: 'Software Engineer',
                        location: 'Location',
                        startDate: '2023-01',
                        endDate: 'Present',
                        isCurrent: true,
                        description: '• Developed key features improving business KPI metrics.'
                      }
                    ]
                  })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {resume.experiences.map((exp, idx) => (
                <div key={exp.id} className="p-3.5 bg-[#060c16] border border-[#16253f] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">Position #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setResume({
                        ...resume,
                        experiences: resume.experiences.filter(e => e.id !== exp.id)
                      })}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => {
                        const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, company: e.target.value } : item);
                        setResume({ ...resume, experiences: updated });
                      }}
                      placeholder="Company Name"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => {
                        const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, role: e.target.value } : item);
                        setResume({ ...resume, experiences: updated });
                      }}
                      placeholder="Job Title"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => {
                        const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, startDate: e.target.value } : item);
                        setResume({ ...resume, experiences: updated });
                      }}
                      placeholder="Start (e.g. 2022-01)"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => {
                        const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, endDate: e.target.value } : item);
                        setResume({ ...resume, experiences: updated });
                      }}
                      placeholder="End (or Present)"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-400">Bullet Points / Key Deliverables</span>
                      <button
                        type="button"
                        onClick={() => handleAIEnhanceExperience(exp.id)}
                        disabled={loadingAI}
                        className="text-[10px] text-cyan-300 font-bold flex items-center gap-1 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40 hover:bg-cyan-900/60"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>AI Action Verbs Polish</span>
                      </button>
                    </div>
                    <textarea
                      value={exp.description}
                      onChange={(e) => {
                        const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, description: e.target.value } : item);
                        setResume({ ...resume, experiences: updated });
                      }}
                      rows={4}
                      placeholder="• Bullet points describing achievements..."
                      className="w-full bg-[#09111e] border border-[#1a2d4b] rounded-lg p-2 text-white font-mono text-[11px] leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: EDUCATION */}
          {activeTab === 'education' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold">Academic Degrees</span>
                <button
                  type="button"
                  onClick={() => setResume({
                    ...resume,
                    education: [
                      ...resume.education,
                      {
                        id: `edu-${Date.now()}`,
                        institution: 'University Name',
                        degree: 'Bachelor of Science',
                        fieldOfStudy: 'Computer Science',
                        startDate: '2018',
                        endDate: '2022',
                        grade: 'First Class'
                      }
                    ]
                  })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Degree</span>
                </button>
              </div>

              {resume.education.map((edu) => (
                <div key={edu.id} className="p-3.5 bg-[#060c16] border border-[#16253f] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, institution: e.target.value } : item);
                        setResume({ ...resume, education: updated });
                      }}
                      placeholder="Institution / College"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white font-bold flex-1 mr-2"
                    />
                    <button
                      type="button"
                      onClick={() => setResume({
                        ...resume,
                        education: resume.education.filter(item => item.id !== edu.id)
                      })}
                      className="text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, degree: e.target.value } : item);
                        setResume({ ...resume, education: updated });
                      }}
                      placeholder="Degree (e.g. B.Tech)"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={edu.fieldOfStudy}
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, fieldOfStudy: e.target.value } : item);
                        setResume({ ...resume, education: updated });
                      }}
                      placeholder="Field of Study"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={edu.startDate + ' - ' + edu.endDate}
                      onChange={(e) => {
                        const parts = e.target.value.split('-');
                        const updated = resume.education.map(item => item.id === edu.id ? {
                          ...item,
                          startDate: parts[0]?.trim() || '',
                          endDate: parts[1]?.trim() || ''
                        } : item);
                        setResume({ ...resume, education: updated });
                      }}
                      placeholder="Years (e.g. 2017 - 2021)"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={edu.grade || ''}
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, grade: e.target.value } : item);
                        setResume({ ...resume, education: updated });
                      }}
                      placeholder="GPA / Grade"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <span className="text-gray-300 font-bold block">Skills &amp; Technologies</span>
              
              {resume.skills.map((skillGroup, idx) => (
                <div key={idx} className="p-3.5 bg-[#060c16] border border-[#16253f] rounded-xl space-y-2">
                  <input
                    type="text"
                    value={skillGroup.category}
                    onChange={(e) => {
                      const updated = [...resume.skills];
                      updated[idx].category = e.target.value;
                      setResume({ ...resume, skills: updated });
                    }}
                    className="font-bold text-cyan-400 bg-transparent focus:outline-none w-full"
                  />
                  <input
                    type="text"
                    value={skillGroup.items.join(', ')}
                    onChange={(e) => {
                      const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      const updated = [...resume.skills];
                      updated[idx].items = items;
                      setResume({ ...resume, skills: updated });
                    }}
                    placeholder="Comma separated skills (e.g. React, Node.js, Python)"
                    className="w-full bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold">Featured Projects</span>
                <button
                  type="button"
                  onClick={() => setResume({
                    ...resume,
                    projects: [
                      ...resume.projects,
                      {
                        id: `proj-${Date.now()}`,
                        name: 'New Project',
                        technologies: 'React, Node.js',
                        description: 'Built a full-stack platform solving business use-cases.',
                        link: 'https://github.com/...'
                      }
                    ]
                  })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Project</span>
                </button>
              </div>

              {resume.projects.map((proj) => (
                <div key={proj.id} className="p-3.5 bg-[#060c16] border border-[#16253f] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => {
                        const updated = resume.projects.map(p => p.id === proj.id ? { ...p, name: e.target.value } : p);
                        setResume({ ...resume, projects: updated });
                      }}
                      placeholder="Project Name"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white font-bold flex-1 mr-2"
                    />
                    <button
                      type="button"
                      onClick={() => setResume({
                        ...resume,
                        projects: resume.projects.filter(p => p.id !== proj.id)
                      })}
                      className="text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={proj.technologies}
                    onChange={(e) => {
                      const updated = resume.projects.map(p => p.id === proj.id ? { ...p, technologies: e.target.value } : p);
                      setResume({ ...resume, projects: updated });
                    }}
                    placeholder="Tech Stack (e.g. Next.js, PostgreSQL, Docker)"
                    className="w-full bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono text-[11px]"
                  />

                  <textarea
                    value={proj.description}
                    onChange={(e) => {
                      const updated = resume.projects.map(p => p.id === proj.id ? { ...p, description: e.target.value } : p);
                      setResume({ ...resume, projects: updated });
                    }}
                    rows={3}
                    placeholder="Project description and impact..."
                    className="w-full bg-[#09111e] border border-[#1a2d4b] rounded-lg p-2 text-white text-[11px] leading-relaxed resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 7: ATS SCANNER & JOB MATCH */}
          {activeTab === 'ats' && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Target Job Description (JD)
                </label>
                <textarea
                  value={targetJD}
                  onChange={(e) => setTargetJD(e.target.value)}
                  rows={6}
                  placeholder="Paste the target job description here to calculate ATS match score and discover missing keywords..."
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/60 leading-relaxed resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleScanATS}
                disabled={loadingAI}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
              >
                {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                <span>Scan ATS Match Score</span>
              </button>

              {atsResult && (
                <div className="p-4 bg-[#060c16] border border-cyan-800/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">ATS Match Score</span>
                    <span className="text-xl font-extrabold text-emerald-400">{atsResult.score}%</span>
                  </div>

                  {atsResult.missingKeywords.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 block mb-1">
                        ⚠️ Recommended Missing Keywords:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {atsResult.missingKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/50 text-amber-300 font-mono text-[10px]">
                            +{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#16253f] text-gray-300 text-[11px] leading-relaxed">
                    💡 {atsResult.summaryFeedback}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: REAL-TIME ATS RESUME CANVAS (7 COLS)
        ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Printable / Live Resume Page (A4 Aspect Ratio Sheet) */}
          <div 
            id="resume-printable-canvas"
            className="w-full bg-white text-gray-900 rounded-2xl p-8 sm:p-12 shadow-2xl min-h-[900px] border border-gray-200 selection:bg-cyan-100 print:p-0 print:border-none print:shadow-none print:m-0"
            style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
          >
            {/* Header / Name */}
            <div className="border-b-2 border-gray-900 pb-4 mb-5 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 uppercase">
                {resume.personalInfo.fullName || 'YOUR NAME'}
              </h1>
              <div className="text-sm font-semibold text-cyan-700 mt-0.5">
                {resume.targetRole || 'Professional Title'}
              </div>

              {/* Contact Strip */}
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 mt-2 font-medium">
                {resume.personalInfo.email && <span>📧 {resume.personalInfo.email}</span>}
                {resume.personalInfo.phone && <span>📱 {resume.personalInfo.phone}</span>}
                {resume.personalInfo.location && <span>📍 {resume.personalInfo.location}</span>}
                {resume.personalInfo.linkedinUrl && (
                  <span>🔗 {resume.personalInfo.linkedinUrl.replace(/^https?:\/\//, '')}</span>
                )}
                {resume.personalInfo.portfolioUrl && (
                  <span>🌐 {resume.personalInfo.portfolioUrl.replace(/^https?:\/\//, '')}</span>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {resume.summary && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
                  Professional Summary
                </h2>
                <p className="text-[11.5px] text-gray-700 leading-relaxed text-justify">
                  {resume.summary}
                </p>
              </div>
            )}

            {/* Work Experience */}
            {resume.experiences.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
                  Work Experience
                </h2>
                <div className="space-y-3.5">
                  {resume.experiences.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex items-baseline justify-between flex-wrap text-xs">
                        <span className="font-bold text-gray-900">{exp.role}</span>
                        <span className="text-[11px] text-gray-600 font-semibold">{exp.startDate} – {exp.endDate}</span>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-gray-700 font-medium italic mb-1">
                        <span>{exp.company}</span>
                        {exp.location && <span>{exp.location}</span>}
                      </div>
                      <div className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line pl-1">
                        {exp.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {resume.education.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
                  Education &amp; Credentials
                </h2>
                <div className="space-y-2">
                  {resume.education.map((edu) => (
                    <div key={edu.id} className="flex items-baseline justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-gray-900">{edu.degree} in {edu.fieldOfStudy}</span>
                        <span className="text-gray-700 block">{edu.institution}</span>
                      </div>
                      <div className="text-right text-gray-600 font-medium">
                        <span>{edu.startDate} – {edu.endDate}</span>
                        {edu.grade && <span className="block text-gray-800 font-semibold">{edu.grade}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Skills */}
            {resume.skills.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">
                  Technical &amp; Core Competencies
                </h2>
                <div className="space-y-1 text-[11px]">
                  {resume.skills.map((skillGroup, idx) => (
                    <div key={idx} className="flex items-baseline">
                      <span className="font-bold text-gray-900 w-36 flex-shrink-0">{skillGroup.category}:</span>
                      <span className="text-gray-700">{skillGroup.items.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Projects */}
            {resume.projects.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-2.5">
                  Featured Projects
                </h2>
                <div className="space-y-2.5">
                  {resume.projects.map((proj) => (
                    <div key={proj.id} className="text-[11px]">
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-gray-900">{proj.name}</span>
                        <span className="text-gray-600 font-mono text-[10px]">{proj.technologies}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Export Bar */}
          <div className="mt-4 flex items-center justify-between w-full text-xs text-gray-400 px-2 print:hidden">
            <div>
              ATS Score: <strong className="text-emerald-400">{resume.atsScore || 90}% Compatible</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadJSON}
                className="hover:text-cyan-300 font-semibold"
              >
                Export JSON
              </button>
              <span>•</span>
              <button
                onClick={handlePrintPDF}
                className="text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Print PDF / A4
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
