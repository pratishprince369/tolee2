import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Wand2, 
  Eye, 
  Database,
  UploadCloud,
  FileUp,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Bot,
  Send,
  X,
  FileCheck,
  Award,
  Layers,
  Check
} from 'lucide-react';
import { 
  ResumeData, 
  extractAndRebuildResumeFromText,
  generateAISummary, 
  enhanceBulletPoint, 
  suggestSkillsForRole,
  analyzeJobDescriptionMatch, 
  askAIAssistant,
  saveUserResume 
} from '@/actions/resumeBuilder';

const DEFAULT_BLANK_RESUME: ResumeData = {
  title: 'My Professional Resume',
  targetRole: '',
  template: 'modern',
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    portfolioUrl: '',
    githubUrl: ''
  },
  summary: '',
  experiences: [],
  education: [],
  skills: [],
  projects: [],
  atsScore: 85,
  jobDescription: ''
};

export default function ResumeBuilderClient() {
  const { status } = useSession();
  const router = useRouter();

  // Navigation & Mode States
  const [viewMode, setViewMode] = useState<'START' | 'UPLOAD' | 'STUDIO'>('START');
  const [studioStep, setStudioStep] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/world/ai-resume-builder'));
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#070b13] text-gray-200 p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 text-sm font-medium animate-pulse">
          {status === 'unauthenticated' ? 'Authentication required. Redirecting to login...' : 'Loading AI Resume Studio...'}
        </p>
      </div>
    );
  }

  // Resume Data State
  const [resume, setResume] = useState<ResumeData>(DEFAULT_BLANK_RESUME);
  const [originalRawText, setOriginalRawText] = useState<string>('');
  const [comparisonTab, setComparisonTab] = useState<'improved' | 'original'>('improved');

  // Upload & Extraction Progress States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedResumeText, setPastedResumeText] = useState<string>('');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [uploadProgressStep, setUploadProgressStep] = useState<number>(0);

  // AI & Async Action States
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // ATS Scanner States
  const [targetJD, setTargetJD] = useState<string>('');
  const [atsResult, setAtsResult] = useState<{
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
    summaryFeedback: string;
  } | null>(null);

  // AI Chat Assistant Drawer
  const [showAssistant, setShowAssistant] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Tolee AI Resume Assistant. Ask me to rewrite your summary, enhance bullet points, check grammar, or optimize for a specific job title.'
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // ══════════════════════════════════════════════════════════════
  // 1. FILE UPLOAD & TEXT EXTRACTION PIPELINE
  // ══════════════════════════════════════════════════════════════
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleStartExtraction = async () => {
    let rawText = pastedResumeText.trim();

    if (!rawText && uploadedFile) {
      try {
        rawText = await uploadedFile.text();
      } catch (err) {
        showToast('❌ Error reading file. Please paste text directly.');
        return;
      }
    }

    if (!rawText || rawText.length < 20) {
      showToast('⚠️ Please choose a valid resume file or paste your resume text.');
      return;
    }

    setOriginalRawText(rawText);
    setIsProcessingUpload(true);
    setUploadProgressStep(1);

    // Progress simulation steps
    setTimeout(() => setUploadProgressStep(2), 700);
    setTimeout(() => setUploadProgressStep(3), 1500);

    const res = await extractAndRebuildResumeFromText(rawText);
    setUploadProgressStep(4);

    if (res.success && res.resume) {
      setResume(res.resume);
      setTimeout(() => {
        setIsProcessingUpload(false);
        setViewMode('STUDIO');
        showToast('🎉 Resume successfully parsed & professionally structured by AI!');
      }, 800);
    } else {
      setIsProcessingUpload(false);
      showToast('❌ ' + (res.error || 'Could not parse resume automatically. Please enter details manually.'));
    }
  };

  // ══════════════════════════════════════════════════════════════
  // 2. AI ASSISTANTS & GENERATORS
  // ══════════════════════════════════════════════════════════════
  const handleAISummaryRewrite = async () => {
    setLoadingAI(true);
    showToast('🤖 AI is crafting a high-impact executive summary...');
    
    const allSkills = resume.skills.flatMap(s => s.items);
    const res = await generateAISummary({
      targetRole: resume.targetRole || 'Professional Role',
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
    showToast('⚡ AI is applying STAR action verbs & formatting...');

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
      showToast('🚀 Experience bullet points upgraded!');
    }
    setLoadingAI(false);
  };

  const handleAISuggestSkills = async () => {
    if (!resume.targetRole.trim()) {
      showToast('⚠️ Please enter a Target Role first.');
      return;
    }
    setLoadingAI(true);
    showToast('💡 Fetching high-demand industry skills for ' + resume.targetRole + '...');

    const res = await suggestSkillsForRole({
      targetRole: resume.targetRole,
      existingSkills: resume.skills.flatMap(s => s.items),
    });

    if (res.success && res.suggestedSkills.length > 0) {
      const existingTech = resume.skills.find(s => s.category.toLowerCase().includes('tech') || s.category.toLowerCase().includes('skill'));
      if (existingTech) {
        setResume(prev => ({
          ...prev,
          skills: prev.skills.map(s => s.category === existingTech.category ? {
            ...s,
            items: Array.from(new Set([...s.items, ...res.suggestedSkills]))
          } : s)
        }));
      } else {
        setResume(prev => ({
          ...prev,
          skills: [...prev.skills, { category: 'Core & Technical Skills', items: res.suggestedSkills }]
        }));
      }
      showToast(`💡 Added ${res.suggestedSkills.length} recommended skills!`);
    }
    setLoadingAI(false);
  };

  const handleScanATS = async () => {
    if (!targetJD.trim()) {
      showToast('⚠️ Please paste a target job description to scan.');
      return;
    }

    setLoadingAI(true);
    showToast('🎯 Scanning ATS match score & keyword density...');

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

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setLoadingAI(true);

    const res = await askAIAssistant({
      userMessage: userMsg,
      currentResume: resume,
    });

    if (res.success && res.reply) {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: res.reply }]);
    }
    setLoadingAI(false);
  };

  // ══════════════════════════════════════════════════════════════
  // 3. DATABASE SAVE & EXPORTS
  // ══════════════════════════════════════════════════════════════
  const handleSaveToDB = async () => {
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

  const handleDownloadDOCX = () => {
    // Generate clean Word Document compatible HTML
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${resume.personalInfo.fullName || 'Resume'}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 40px; }
          h1 { font-size: 20pt; text-transform: uppercase; margin-bottom: 2px; color: #111; }
          .title { font-size: 12pt; color: #0284c7; font-weight: bold; margin-bottom: 8px; }
          .contact { font-size: 9.5pt; color: #555; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 6px; }
          h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #999; padding-bottom: 3px; margin-top: 14px; margin-bottom: 6px; color: #111; }
          .role { font-weight: bold; }
          .company { font-style: italic; color: #444; }
          .date { float: right; color: #666; font-size: 9.5pt; }
          p, ul { margin-top: 3px; margin-bottom: 6px; }
          li { margin-bottom: 3px; }
        </style>
      </head>
      <body>
        <h1>${resume.personalInfo.fullName || 'FULL NAME'}</h1>
        <div class='title'>${resume.targetRole || 'Professional Title'}</div>
        <div class='contact'>
          ${[resume.personalInfo.email, resume.personalInfo.phone, resume.personalInfo.location, resume.personalInfo.linkedinUrl, resume.personalInfo.portfolioUrl].filter(Boolean).join('  |  ')}
        </div>

        ${resume.summary ? `<h2>Professional Summary</h2><p>${resume.summary}</p>` : ''}

        ${resume.experiences.length > 0 ? `
          <h2>Work Experience</h2>
          ${resume.experiences.map(e => `
            <div>
              <span class='role'>${e.role}</span> — <span class='company'>${e.company}</span>
              <span class='date'>${e.startDate} – ${e.endDate}</span>
              <p>${e.description.replace(/\n/g, '<br/>')}</p>
            </div>
          `).join('')}
        ` : ''}

        ${resume.education.length > 0 ? `
          <h2>Education</h2>
          ${resume.education.map(ed => `
            <div>
              <span class='role'>${ed.degree} in ${ed.fieldOfStudy}</span> — <span class='company'>${ed.institution}</span>
              <span class='date'>${ed.startDate} – ${ed.endDate}</span>
              ${ed.grade ? `<div>Grade: ${ed.grade}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}

        ${resume.skills.length > 0 ? `
          <h2>Skills</h2>
          ${resume.skills.map(s => `<p><strong>${s.category}:</strong> ${s.items.join(', ')}</p>`).join('')}
        ` : ''}

        ${resume.projects.length > 0 ? `
          <h2>Projects</h2>
          ${resume.projects.map(p => `
            <div>
              <strong>${p.name}</strong> (${p.technologies})
              <p>${p.description}</p>
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(resume.personalInfo.fullName || 'Resume').replace(/\s+/g, '_')}_Resume.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('📄 Downloaded Word Document (.doc)!');
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resume, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `${(resume.personalInfo.fullName || 'Resume').replace(/\s+/g, '_')}_Resume.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('📦 Exported Resume JSON data!');
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER SCREEN 1: START SCREEN
  // ══════════════════════════════════════════════════════════════
  if (viewMode === 'START') {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-center">
        
        {/* Top Back Link */}
        <div className="w-full max-w-4xl mb-6">
          <Link 
            href="/world" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-[#0e1626] border border-[#1e293b] px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tolee World</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="w-full max-w-4xl bg-[#0b1220] border border-[#182842] rounded-3xl p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
          
          {/* Subtle Glow Background */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>POWERED BY TOLEE MULTI-MODEL AI (LLAMA 70B &amp; QWEN 72B)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Build Your Professional Resume with AI
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload your existing resume or create a new one from scratch. Tolee AI will improve your content, structure, STAR action verbs, and ATS compatibility score.
          </p>

          {/* Two Primary Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            
            {/* Option 1: Upload Existing Resume */}
            <div
              onClick={() => setViewMode('UPLOAD')}
              className="bg-[#0e1728] border-2 border-[#1c2e4d] hover:border-cyan-500/70 hover:bg-[#121f36] rounded-2xl p-6 text-left cursor-pointer transition-all duration-300 group shadow-xl active:scale-95 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5 flex items-center justify-between">
                  <span>Upload Existing Resume</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upload PDF, DOCX, or paste text. AI will parse your history and enhance every bullet point professionally.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#192842] text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                <span>Supports PDF, DOCX, TXT</span>
              </div>
            </div>

            {/* Option 2: Create New Resume */}
            <div
              onClick={() => {
                setResume(DEFAULT_BLANK_RESUME);
                setViewMode('STUDIO');
              }}
              className="bg-[#0e1728] border-2 border-[#1c2e4d] hover:border-blue-500/70 hover:bg-[#121f36] rounded-2xl p-6 text-left cursor-pointer transition-all duration-300 group shadow-xl active:scale-95 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform shadow-inner">
                  <Wand2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors mb-1.5 flex items-center justify-between">
                  <span>Create New Resume</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Step-by-step guided creator with AI summary generator, skill suggester, and live ATS preview canvas.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#192842] text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                <span>Guided Step-by-Step Wizard</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER SCREEN 2: UPLOAD & EXTRACTION SCREEN
  // ══════════════════════════════════════════════════════════════
  if (viewMode === 'UPLOAD') {
    return (
      <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-center">
        
        {/* Top Back Button */}
        <div className="w-full max-w-2xl mb-4">
          <button 
            onClick={() => setViewMode('START')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-[#0e1626] border border-[#1e293b] px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Start Choices</span>
          </button>
        </div>

        <div className="w-full max-w-2xl bg-[#0b1220] border border-[#182842] rounded-3xl p-6 sm:p-10 shadow-2xl">
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              Upload Your Existing Resume
            </h2>
            <p className="text-xs text-gray-400">
              Tolee AI will extract your real experience and upgrade it into an ATS-friendly masterpiece.
            </p>
          </div>

          {/* Progress Tracker Modal when processing */}
          {isProcessingUpload ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white">
                Tolee AI is Rebuilding Your Resume...
              </h3>
              
              <div className="max-w-xs mx-auto space-y-2 text-left text-xs text-gray-300">
                <div className={`flex items-center gap-2 ${uploadProgressStep >= 1 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Reading &amp; extracting document content</span>
                </div>
                <div className={`flex items-center gap-2 ${uploadProgressStep >= 2 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. Detecting structure &amp; work history</span>
                </div>
                <div className={`flex items-center gap-2 ${uploadProgressStep >= 3 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Enhancing bullet points with STAR action verbs</span>
                </div>
                <div className={`flex items-center gap-2 ${uploadProgressStep >= 4 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. Preparing live preview canvas</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1f3354] hover:border-cyan-500/70 bg-[#060c16] rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept=".pdf,.doc,.docx,.txt" 
                  className="hidden" 
                />
                
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center mx-auto text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                  <FileUp className="w-6 h-6" />
                </div>
                
                <h4 className="text-sm font-bold text-white mb-1">
                  {uploadedFile ? uploadedFile.name : 'Drag & Drop your resume here, or Browse'}
                </h4>
                <p className="text-xs text-gray-500">
                  Supports PDF, DOCX, DOC, TXT (Max 10MB)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-[#152338]" />
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">OR PASTE TEXT</span>
                <div className="flex-1 h-[1px] bg-[#152338]" />
              </div>

              {/* Paste Raw Textarea */}
              <div>
                <textarea
                  value={pastedResumeText}
                  onChange={(e) => setPastedResumeText(e.target.value)}
                  rows={5}
                  placeholder="Paste your raw resume text here if you don't have the file handy..."
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500/60 leading-relaxed font-mono resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleStartExtraction}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 active:scale-95 transition-all text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upload &amp; Transform with AI</span>
              </button>

            </div>
          )}

        </div>

      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER SCREEN 3: LIVE STUDIO & STEP-BY-STEP BUILDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] font-sans pb-28 pt-20 px-3 sm:px-6 lg:px-10">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-[#0f172a] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          {notification}
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-4 print:hidden">
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('START')}
            className="p-2.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-400 hover:text-white hover:border-cyan-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Choices</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              AI Resume Studio &amp; ATS Matcher
            </h1>
          </div>
        </div>

        {/* Right Action Bar */}
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

          {/* AI Assistant Drawer Toggle */}
          <button
            onClick={() => setShowAssistant(!showAssistant)}
            className="px-3.5 py-2 rounded-xl bg-[#111f38] hover:bg-[#182e52] border border-cyan-700/50 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>

          {/* Save to tolee-1 DB */}
          <button
            onClick={handleSaveToDB}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-[#0e1c31] hover:bg-[#152a48] border border-cyan-800/50 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save DB'}</span>
          </button>

          {/* Download DOCX */}
          <button
            onClick={handleDownloadDOCX}
            className="px-3.5 py-2 rounded-xl bg-[#12233c] hover:bg-[#1c365c] border border-blue-800/50 text-blue-300 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
            title="Download Word Document (.doc)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>DOCX</span>
          </button>

          {/* Print / Download PDF */}
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>

        </div>

      </div>

      {/* Mobile Editor vs Preview Toggle Bar */}
      <div className="flex lg:hidden items-center justify-center mb-4 print:hidden">
        <div className="bg-[#0b1220] border border-[#182842] rounded-xl p-1 flex gap-1 text-xs">
          <button
            onClick={() => setMobileTab('editor')}
            className={`px-4 py-1.5 rounded-lg font-bold ${mobileTab === 'editor' ? 'bg-cyan-500 text-black' : 'text-gray-400'}`}
          >
            Edit Form
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`px-4 py-1.5 rounded-lg font-bold ${mobileTab === 'preview' ? 'bg-cyan-500 text-black' : 'text-gray-400'}`}
          >
            Live Preview
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left = Step Form Editor | Right = Live Resume Canvas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN: STEP-BY-STEP GUIDED FORM (5 COLS)
        ══════════════════════════════════════════════════════════════ */}
        <div className={`lg:col-span-5 bg-[#0b1220] border border-[#182842] rounded-2xl p-5 shadow-2xl print:hidden ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Step Progress Stepper Bar */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#142036] text-xs">
            <span className="font-bold text-cyan-400">
              STEP {studioStep} of 7: {
                studioStep === 1 ? 'Personal Info' :
                studioStep === 2 ? 'Professional Summary' :
                studioStep === 3 ? 'Work Experience' :
                studioStep === 4 ? 'Education' :
                studioStep === 5 ? 'Skills' :
                studioStep === 6 ? 'Projects & Certs' : 'ATS Job Matcher'
              }
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(s => (
                <button
                  key={s}
                  onClick={() => setStudioStep(s)}
                  className={`w-6 h-6 rounded-lg font-bold text-[11px] transition-all ${
                    studioStep === s ? 'bg-cyan-500 text-black' : 'bg-[#060c16] text-gray-400 hover:text-white border border-[#142036]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: PERSONAL INFORMATION */}
          {studioStep === 1 && (
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
                  placeholder="e.g. Aarav Sharma"
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Target Role / Headline</label>
                <input
                  type="text"
                  value={resume.targetRole}
                  onChange={(e) => setResume({ ...resume, targetRole: e.target.value })}
                  placeholder="e.g. Senior Full Stack Software Engineer"
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
                    placeholder="name@email.com"
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
                    placeholder="+91 98xxx xxxxx"
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
                  placeholder="e.g. Bengaluru, India"
                  className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={resume.personalInfo.linkedinUrl || ''}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, linkedinUrl: e.target.value }
                    })}
                    placeholder="linkedin.com/in/..."
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Portfolio / GitHub</label>
                  <input
                    type="text"
                    value={resume.personalInfo.portfolioUrl || ''}
                    onChange={(e) => setResume({
                      ...resume,
                      personalInfo: { ...resume.personalInfo, portfolioUrl: e.target.value }
                    })}
                    placeholder="github.com/..."
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROFESSIONAL SUMMARY */}
          {studioStep === 2 && (
            <div className="space-y-3 text-xs animate-in fade-in">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Career Seniority Level</label>
                  <select
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                  >
                    <option value="Fresher">Fresher / Graduate</option>
                    <option value="Entry Level">Entry Level (1-2 yrs)</option>
                    <option value="Mid Level" selected>Mid Level (3-5 yrs)</option>
                    <option value="Senior">Senior (5-8 yrs)</option>
                    <option value="Manager / Lead">Manager / Tech Lead (8+ yrs)</option>
                    <option value="Director / Executive">Director / VP / Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Target Industry / Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. Fintech, SaaS, Healthcare"
                    className="w-full bg-[#060c16] border border-[#182842] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-gray-300 font-semibold">Professional Summary (3-4 Sentences)</label>
                <button
                  type="button"
                  onClick={handleAISummaryRewrite}
                  disabled={loadingAI}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-lg transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Generate / Polish</span>
                </button>
              </div>

              <textarea
                value={resume.summary}
                onChange={(e) => setResume({ ...resume, summary: e.target.value })}
                rows={6}
                placeholder="Write or generate your executive summary highlighting your core expertise and achievements..."
                className="w-full bg-[#060c16] border border-[#182842] rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500/60 leading-relaxed resize-none font-sans text-xs"
              />
            </div>
          )}

          {/* STEP 3: WORK EXPERIENCE */}
          {studioStep === 3 && (
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
                        company: 'Company Name',
                        role: 'Software Engineer',
                        location: 'City, Country',
                        startDate: '2023-01',
                        endDate: 'Present',
                        isCurrent: true,
                        description: '• Spearheaded project development and delivered key milestones.'
                      }
                    ]
                  })}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              {resume.experiences.length === 0 ? (
                <div className="p-6 text-center text-gray-500 bg-[#060c16] rounded-xl border border-[#142036]">
                  No experiences added yet. Click "+ Add Role" above.
                </div>
              ) : (
                resume.experiences.map((exp, idx) => (
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
                        <span className="text-[11px] text-gray-400">Bullet Points / Deliverables</span>
                        <button
                          type="button"
                          onClick={() => handleAIEnhanceExperience(exp.id)}
                          disabled={loadingAI}
                          className="text-[10px] text-cyan-300 font-bold flex items-center gap-1 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40 hover:bg-cyan-900/60"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>AI STAR Polish</span>
                        </button>
                      </div>
                      <textarea
                        value={exp.description}
                        onChange={(e) => {
                          const updated = resume.experiences.map(item => item.id === exp.id ? { ...item, description: e.target.value } : item);
                          setResume({ ...resume, experiences: updated });
                        }}
                        rows={4}
                        placeholder="• Bullet points describing responsibilities and achievements..."
                        className="w-full bg-[#09111e] border border-[#1a2d4b] rounded-lg p-2 text-white font-mono text-[11px] leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* STEP 4: EDUCATION */}
          {studioStep === 4 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold">Education &amp; Degrees</span>
                <button
                  type="button"
                  onClick={() => setResume({
                    ...resume,
                    education: [
                      ...resume.education,
                      {
                        id: `edu-${Date.now()}`,
                        institution: 'University / Institute Name',
                        degree: 'Bachelor of Technology',
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
                      placeholder="Grade / CGPA"
                      className="bg-[#09111e] border border-[#1a2d4b] rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 5: SKILLS */}
          {studioStep === 5 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold">Skills &amp; Technologies</span>
                <button
                  type="button"
                  onClick={handleAISuggestSkills}
                  disabled={loadingAI}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 font-bold flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI Suggest Skills</span>
                </button>
              </div>

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

          {/* STEP 6: PROJECTS & CERTS */}
          {studioStep === 6 && (
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
                        name: 'Project Title',
                        technologies: 'React, Node.js, Cloud',
                        description: 'Architected and deployed application delivering scalable metrics.',
                        link: ''
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
                    placeholder="Tech Stack (e.g. Next.js, PostgreSQL)"
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

          {/* STEP 7: ATS SCANNER & JOB MATCH */}
          {studioStep === 7 && (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Target Job Description (JD)
                </label>
                <textarea
                  value={targetJD}
                  onChange={(e) => setTargetJD(e.target.value)}
                  rows={6}
                  placeholder="Paste the target job posting description here to calculate ATS match score & missing keywords..."
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
                    <span className="font-bold text-white">Estimated ATS Compatibility</span>
                    <span className="text-xl font-extrabold text-emerald-400">{atsResult.score}%</span>
                  </div>

                  {atsResult.missingKeywords.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-amber-400 block mb-1">
                        ⚠️ Recommended Missing Keywords:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {atsResult.missingKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800/50 text-amber-300 font-mono text-[10px]">
                            +{kw}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const existingTech = resume.skills.find(s => s.category.toLowerCase().includes('tech') || s.category.toLowerCase().includes('skill'));
                          if (existingTech) {
                            setResume(prev => ({
                              ...prev,
                              skills: prev.skills.map(s => s.category === existingTech.category ? {
                                ...s,
                                items: Array.from(new Set([...s.items, ...atsResult.missingKeywords]))
                              } : s)
                            }));
                          } else {
                            setResume(prev => ({
                              ...prev,
                              skills: [...prev.skills, { category: 'Target Job Keywords', items: atsResult.missingKeywords }]
                            }));
                          }
                          showToast('🚀 Missing ATS keywords incorporated into Skills section!');
                        }}
                        className="w-full bg-[#112338] hover:bg-[#183252] border border-cyan-700/50 text-cyan-300 font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>⚡ Optimize Resume for This Job (Add Missing Keywords)</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#16253f] text-gray-300 text-[11px] leading-relaxed">
                    💡 {atsResult.summaryFeedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Footer */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#142036]">
            <button
              onClick={() => setStudioStep(s => Math.max(1, s - 1))}
              disabled={studioStep === 1}
              className="px-3.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setStudioStep(s => Math.min(7, s + 1))}
              disabled={studioStep === 7}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: REAL-TIME ATS RESUME CANVAS (7 COLS)
        ══════════════════════════════════════════════════════════════ */}
        <div className={`lg:col-span-7 flex flex-col items-center ${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          
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

      {/* ══════════════════════════════════════════════════════════════
          AI CHAT ASSISTANT DRAWER (SLIDE-IN)
      ══════════════════════════════════════════════════════════════ */}
      {showAssistant && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-[#0b1220] border border-[#1b2b48] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[460px] animate-in slide-in-from-bottom-5">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[#070d18] border-b border-[#152338] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Tolee AI Resume Assistant</span>
            </div>
            <button
              onClick={() => setShowAssistant(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white ml-6'
                    : 'bg-[#0e1728] border border-[#192b47] text-gray-200 mr-6'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChatMessage} className="p-2.5 bg-[#070d18] border-t border-[#152338] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. Make my summary more executive..."
              className="flex-1 bg-[#0b1220] border border-[#182842] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
            />
            <button
              type="submit"
              disabled={loadingAI}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
