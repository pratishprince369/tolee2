import { ToleeTypeConfig } from './types';

export const TOLEE_TYPE_REGISTRY: Record<string, ToleeTypeConfig> = {
  society: {
    id: 'society',
    slug: 'society',
    title: 'Society Management',
    icon: 'Building2',
    description: 'Complete housing society & apartment complex management platform.',
    estimatedMembers: '50 - 500 Residents',
    categoryTag: 'Residential',
    defaultPrivacy: 'private',
    defaultSearchable: true,
    roles: [
      { id: 'chairman', name: 'Chairman', description: 'Society President & Administrative Lead', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'secretary', name: 'Secretary', description: 'Operations & Notice Management', canManageMembers: true },
      { id: 'treasurer', name: 'Treasurer', description: 'Maintenance Billing & Financial Reports', canManagePayments: true },
      { id: 'committee', name: 'Committee Member', description: 'Governance & Event Planning' },
      { id: 'resident', name: 'Flat Owner / Resident', description: 'Resident Owner / Tenant', isDefault: true, canPostContent: true },
      { id: 'security', name: 'Security Guard', description: 'Gate Pass & Visitor Approval' }
    ],
    features: [
      { id: 'billing', name: 'Maintenance Billing', iconName: 'Receipt', description: 'Automated monthly maintenance bills & online collection', enabledByDefault: true, category: 'finance' },
      { id: 'visitor_entry', name: 'Visitor Entry & Gate Pass', iconName: 'ShieldCheck', description: 'Digital QR gate pass for guests and delivery agents', enabledByDefault: true, category: 'operations' },
      { id: 'complaints', name: 'AI Complaints Desk', iconName: 'AlertCircle', description: 'Raise and track society maintenance issues', enabledByDefault: true, category: 'operations' },
      { id: 'notice_board', name: 'Digital Notice Board', iconName: 'FileText', description: 'Official announcements and guidelines', enabledByDefault: true, category: 'core' },
      { id: 'amenity_booking', name: 'Clubhouse & Lift Schedule', iconName: 'Calendar', description: 'Book clubhouse, terrace or service lift slots', enabledByDefault: false, category: 'operations' }
    ],
    aiAssistant: {
      name: 'Society AI Assistant',
      roleDescription: 'Handles resident complaints, drafts meeting notices, and tracks maintenance deadlines.',
      systemPrompt: 'You are the Society Management AI Assistant for Tolee. Help residents resolve maintenance queries and draft official society notices.',
      suggestedPrompts: ['Draft a notice for upcoming AGMs', 'How do I pay maintenance bill?', 'Raise a plumbing complaint']
    }
  },
  office: {
    id: 'office',
    slug: 'office',
    title: 'Office Management',
    icon: 'Briefcase',
    description: 'Corporate workplace, employee directory, attendance & task manager.',
    estimatedMembers: '10 - 200 Employees',
    categoryTag: 'Business',
    defaultPrivacy: 'private',
    defaultSearchable: false,
    roles: [
      { id: 'ceo', name: 'CEO / Founder', description: 'Executive Leadership', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'hr', name: 'HR Manager', description: 'Employee Records & Attendance', canManageMembers: true },
      { id: 'manager', name: 'Team Lead / Manager', description: 'Project & Task Supervision' },
      { id: 'employee', name: 'Employee', description: 'Full-time Team Member', isDefault: true, canPostContent: true },
      { id: 'intern', name: 'Intern', description: 'Trainee' }
    ],
    features: [
      { id: 'attendance', name: 'Attendance & Leave', iconName: 'Clock', description: 'Geo-fenced attendance and leave requests', enabledByDefault: true, category: 'operations' },
      { id: 'tasks', name: 'Tasks & Projects', iconName: 'CheckSquare', description: 'Kanban boards and project task tracking', enabledByDefault: true, category: 'operations' },
      { id: 'salary_slips', name: 'Salary Slips & Docs', iconName: 'FileText', description: 'Secure digital document repository', enabledByDefault: true, category: 'finance' },
      { id: 'ai_meeting_notes', name: 'AI Meeting Summarizer', iconName: 'Sparkles', description: 'Automatically transcribes and summarizes meetings', enabledByDefault: true, category: 'ai' }
    ],
    aiAssistant: {
      name: 'Office Workplace AI',
      roleDescription: 'Assists HR with policy queries, summarizes team tasks, and writes meeting notes.',
      systemPrompt: 'You are the Office Management AI Assistant. Help employees check leave policies, draft emails, and summarize team tasks.',
      suggestedPrompts: ['Draft a leave request email', 'Summarize today\'s team tasks', 'What is our remote work policy?']
    }
  },
  crm: {
    id: 'crm',
    slug: 'crm',
    title: 'CRM & Sales Engine',
    icon: 'TrendingUp',
    description: 'Lead pipeline, customer engagement, and sales automation platform.',
    estimatedMembers: '5 - 50 Sales Reps',
    categoryTag: 'Sales',
    defaultPrivacy: 'private',
    defaultSearchable: false,
    roles: [
      { id: 'sales_head', name: 'Sales Director', description: 'Pipeline Oversight', canManageSettings: true, canManageMembers: true },
      { id: 'sales_rep', name: 'Sales Representative', description: 'Lead Owner', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'leads', name: 'Lead Pipeline', iconName: 'Kanban', description: 'Visual sales funnel from lead capture to closing', enabledByDefault: true, category: 'operations' },
      { id: 'auto_whatsapp', name: 'WhatsApp & Email Automation', iconName: 'MessageSquare', description: 'Instant follow-up messaging for new prospects', enabledByDefault: true, category: 'engagement' },
      { id: 'sales_reports', name: 'Revenue Analytics', iconName: 'BarChart3', description: 'Real-time revenue forecast and deal stats', enabledByDefault: true, category: 'finance' }
    ],
    aiAssistant: {
      name: 'Sales Copilot AI',
      roleDescription: 'Generates sales pitches, drafts customer follow-ups, and analyzes deal conversion.',
      systemPrompt: 'You are the CRM Sales Copilot AI. Help sales reps write persuasive follow-ups and overcome objections.',
      suggestedPrompts: ['Write a follow-up WhatsApp message for a cold lead', 'Draft a sales proposal intro', 'How to handle price objection?']
    }
  },
  friends_mandal: {
    id: 'friends_mandal',
    slug: 'friends-mandal',
    title: 'Friends Mandal / Club',
    icon: 'PartyPopper',
    description: 'Festivals, sports clubs, bike/travel groups, and community events.',
    estimatedMembers: '20 - 1000 Members',
    categoryTag: 'Social & Cultural',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'president', name: 'President / Organizer', description: 'Event & Mandal Lead', canManageSettings: true, canManageMembers: true },
      { id: 'volunteer', name: 'Volunteer / Worker', description: 'Event Setup & Collection' },
      { id: 'member', name: 'Member', description: 'Group Member', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'donations', name: 'QR Collection & Donations', iconName: 'QrCode', description: 'Instant UPI donation receipts for festivals & events', enabledByDefault: true, category: 'finance' },
      { id: 'events', name: 'Event Planner & Gallery', iconName: 'Calendar', description: 'Organize trips, matches, and festival celebrations', enabledByDefault: true, category: 'engagement' },
      { id: 'group_polls', name: 'Group Voting & Polls', iconName: 'Vote', description: 'Quick group decisions on dates, budget, and venues', enabledByDefault: true, category: 'core' }
    ],
    aiAssistant: {
      name: 'Mandal Event AI',
      roleDescription: 'Helps plan festival budgets, draft event invitations, and manage volunteer schedules.',
      systemPrompt: 'You are the Friends Mandal AI Assistant. Help organizers plan memorable events and write catchy invitations.',
      suggestedPrompts: ['Create a festival budget template', 'Draft a weekend trip invitation', 'Ideas for Diwali sports competition']
    }
  },
  college: {
    id: 'college',
    slug: 'college',
    title: 'College Campus',
    icon: 'GraduationCap',
    description: 'Higher education portal, departments, student clubs, and campus notices.',
    estimatedMembers: '500 - 5000 Students',
    categoryTag: 'Education',
    defaultPrivacy: 'private',
    defaultSearchable: true,
    roles: [
      { id: 'principal', name: 'Principal / Dean', description: 'Campus Administrator', canManageSettings: true, canManageMembers: true },
      { id: 'hod', name: 'HOD / Professor', description: 'Department Head' },
      { id: 'student', name: 'Student', description: 'Enrolled Student', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'campus_notices', name: 'Exam & Fee Notices', iconName: 'Bell', description: 'Official department announcements', enabledByDefault: true, category: 'core' },
      { id: 'library', name: 'E-Library & Notes', iconName: 'BookOpen', description: 'Share study materials and research papers', enabledByDefault: true, category: 'operations' },
      { id: 'placements', name: 'Placement Cell', iconName: 'Award', description: 'Job openings and campus interview alerts', enabledByDefault: true, category: 'engagement' }
    ],
    aiAssistant: {
      name: 'Academic Campus AI',
      roleDescription: 'Assists students with study notes, assignment tips, and exam preparation.',
      systemPrompt: 'You are the College Campus AI Assistant. Provide academic guidance, study plans, and career prep tips.',
      suggestedPrompts: ['Help outline a computer science report', 'Tips for campus interview prep', 'Draft exam timetable notice']
    }
  },
  school: {
    id: 'school',
    slug: 'school',
    title: 'School Operating System',
    icon: 'School',
    description: 'K-12 school portal for teachers, students, parents, and bus tracking.',
    estimatedMembers: '200 - 2000 Students',
    categoryTag: 'Education',
    defaultPrivacy: 'private',
    defaultSearchable: true,
    roles: [
      { id: 'principal', name: 'School Principal', description: 'School Administrator', canManageSettings: true, canManageMembers: true },
      { id: 'teacher', name: 'Class Teacher', description: 'Academic Instructor' },
      { id: 'parent', name: 'Parent', description: 'Parent / Guardian', isDefault: true }
    ],
    features: [
      { id: 'homework', name: 'Homework & Attendance', iconName: 'CheckCircle2', description: 'Daily homework log and attendance reports', enabledByDefault: true, category: 'operations' },
      { id: 'bus_tracking', name: 'School Bus GPS', iconName: 'Bus', description: 'Live bus location tracking for parents', enabledByDefault: true, category: 'operations' },
      { id: 'teacher_chat', name: 'Parent-Teacher Communication', iconName: 'MessageCircle', description: 'Direct secure messaging with teachers', enabledByDefault: true, category: 'engagement' }
    ],
    aiAssistant: {
      name: 'School Teacher AI',
      roleDescription: 'Helps teachers generate lesson plans and helps parents track student progress.',
      systemPrompt: 'You are the School OS AI Assistant. Assist teachers with creative lesson plans and clear parent communications.',
      suggestedPrompts: ['Generate a 5th grade science lesson plan', 'Draft a parent meeting reminder', 'Fun weekend learning activities']
    }
  },
  shop: {
    id: 'shop',
    slug: 'shop',
    title: 'Retail Shop & Store',
    icon: 'ShoppingCart',
    description: 'Inventory management, POS billing, GST invoicing, and customer loyalty.',
    estimatedMembers: '5 - 30 Staff & Customers',
    categoryTag: 'Commerce',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'owner', name: 'Store Owner', description: 'Full Access', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'cashier', name: 'Billing Cashier', description: 'POS Operator', isDefault: true }
    ],
    features: [
      { id: 'billing_pos', name: 'Barcode & POS Billing', iconName: 'Printer', description: 'Quick retail checkout with GST invoices', enabledByDefault: true, category: 'finance' },
      { id: 'inventory', name: 'Inventory & Stock Alert', iconName: 'Package', description: 'Track stock levels and expiry warnings', enabledByDefault: true, category: 'operations' }
    ],
    aiAssistant: {
      name: 'Store Sales AI',
      roleDescription: 'Predicts inventory demand, writes promotional SMS, and tracks top-selling products.',
      systemPrompt: 'You are the Retail Shop AI Assistant. Help store owners analyze sales trends and write discount marketing copy.',
      suggestedPrompts: ['Write a promotional offer message for customers', 'Which products should I restock first?', 'Draft festival sale advertisement']
    }
  },
  political: {
    id: 'political',
    slug: 'political',
    title: 'Political Organization',
    icon: 'Landmark',
    description: 'Ward, booth management, volunteer campaigns, and speech library.',
    estimatedMembers: '100 - 10000 Cadre',
    categoryTag: 'Governance',
    defaultPrivacy: 'private',
    defaultSearchable: true,
    roles: [
      { id: 'leader', name: 'Party Leader / MP / MLA', description: 'Chief Leader', canManageSettings: true, canManageMembers: true },
      { id: 'booth_incharge', name: 'Booth In-charge', description: 'Local Field Manager' },
      { id: 'karyakarta', name: 'Party Volunteer / Worker', description: 'Field Worker', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'booth_mgmt', name: 'Booth & Member Mapping', iconName: 'Map', description: 'Manage cadre across wards and polling booths', enabledByDefault: true, category: 'operations' },
      { id: 'ai_speech', name: 'AI Speech & Campaign Assistant', iconName: 'Sparkles', description: 'Draft speeches, press releases and rally slogans', enabledByDefault: true, category: 'ai' }
    ],
    aiAssistant: {
      name: 'Campaign Speech AI',
      roleDescription: 'Drafts public rally speeches, press statements, and social media posts.',
      systemPrompt: 'You are the Political Campaign AI Assistant. Write inspiring public speeches and campaign press statements.',
      suggestedPrompts: ['Draft a speech for youth rally', 'Write a press release on local development work', 'Key points for ward meeting']
    }
  },
  ngo: {
    id: 'ngo',
    slug: 'ngo',
    title: 'NGO & Social Foundation',
    icon: 'HeartHandshake',
    description: 'Donor management, volunteer campaigns, CSR reporting, and impact certificates.',
    estimatedMembers: '50 - 2000 Volunteers',
    categoryTag: 'Social Impact',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'director', name: 'Managing Trustee', description: 'NGO Head', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'volunteer', name: 'Volunteer', description: 'Field Worker', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'donations_csr', name: '80G Donation & CSR Portal', iconName: 'Gift', description: 'Generate tax-exempt donation receipts', enabledByDefault: true, category: 'finance' },
      { id: 'campaigns', name: 'Volunteer Drives', iconName: 'Users', description: 'Organize blood donation, tree plantation & food drives', enabledByDefault: true, category: 'engagement' }
    ],
    aiAssistant: {
      name: 'NGO Grant AI',
      roleDescription: 'Drafts CSR grant proposals, impact reports, and volunteer callouts.',
      systemPrompt: 'You are the NGO AI Assistant. Help write grant proposals and showcase social impact.',
      suggestedPrompts: ['Write a CSR grant proposal for education fund', 'Draft volunteer invitation for tree planting', 'Social media impact story']
    }
  },
  factory: {
    id: 'factory',
    slug: 'factory',
    title: 'Factory & Manufacturing',
    icon: 'Factory',
    description: 'Shift management, machine status, worker attendance, and safety logs.',
    estimatedMembers: '50 - 1000 Workers',
    categoryTag: 'Industry',
    defaultPrivacy: 'private',
    defaultSearchable: false,
    roles: [
      { id: 'plant_head', name: 'Plant Head', description: 'Factory Director', canManageSettings: true, canManageMembers: true },
      { id: 'supervisor', name: 'Shift Supervisor', description: 'Floor In-charge' },
      { id: 'worker', name: 'Factory Worker', description: 'Operator', isDefault: true }
    ],
    features: [
      { id: 'shift_schedule', name: 'Shift Roster & Attendance', iconName: 'Clock', description: 'Manage morning, evening, and night shift schedules', enabledByDefault: true, category: 'operations' },
      { id: 'machine_status', name: 'Machine Maintenance', iconName: 'Wrench', description: 'Log machine downtime and breakdown alerts', enabledByDefault: true, category: 'operations' }
    ],
    aiAssistant: {
      name: 'Plant Operations AI',
      roleDescription: 'Monitors production downtime, shift rosters, and safety compliance.',
      systemPrompt: 'You are the Factory Plant Operations AI. Assist supervisors with shift handovers and safety protocols.',
      suggestedPrompts: ['Draft shift handover notes', 'Safety checklist for machine operation', 'How to handle equipment breakdown?']
    }
  },
  board_meeting: {
    id: 'board_meeting',
    slug: 'board-meeting',
    title: 'Board Meeting & Governance',
    icon: 'ClipboardList',
    description: 'Confidential board meetings, digital signatures, compliance, and voting.',
    estimatedMembers: '5 - 25 Board Members',
    categoryTag: 'Corporate',
    defaultPrivacy: 'private',
    defaultSearchable: false,
    roles: [
      { id: 'chairman', name: 'Board Chairman', description: 'Meeting Chair', canManageSettings: true, canManageMembers: true },
      { id: 'director', name: 'Board Director', description: 'Voting Member', isDefault: true }
    ],
    features: [
      { id: 'agenda_minutes', name: 'Agenda & AI Minutes', iconName: 'FileCheck', description: 'Draft confidential agendas and auto-generate board minutes', enabledByDefault: true, category: 'operations' },
      { id: 'digital_voting', name: 'Encrypted Board Resolution Voting', iconName: 'Lock', description: 'Secure voting on corporate resolutions', enabledByDefault: true, category: 'core' }
    ],
    aiAssistant: {
      name: 'Board Secretary AI',
      roleDescription: 'Formats board resolution documents and summarizes confidential meeting minutes.',
      systemPrompt: 'You are the Board Secretary AI Assistant. Maintain strict confidentiality while formatting corporate resolutions.',
      suggestedPrompts: ['Format resolution for opening bank account', 'Draft board meeting agenda', 'Summarize key action items']
    }
  },
  hospital: {
    id: 'hospital',
    slug: 'hospital',
    title: 'Hospital & Healthcare',
    icon: 'Stethoscope',
    description: 'Doctor appointments, OPD/IPD queues, patient records, and pharmacy.',
    estimatedMembers: '50 - 500 Staff & Patients',
    categoryTag: 'Healthcare',
    defaultPrivacy: 'private',
    defaultSearchable: true,
    roles: [
      { id: 'medical_director', name: 'Medical Director', description: 'Hospital Lead', canManageSettings: true, canManageMembers: true },
      { id: 'doctor', name: 'Doctor / Specialist', description: 'Attending Doctor' },
      { id: 'patient', name: 'Patient', description: 'Patient', isDefault: true }
    ],
    features: [
      { id: 'appointments', name: 'OPD Appointment Queue', iconName: 'Calendar', description: 'Digital token system for doctor consultations', enabledByDefault: true, category: 'operations' },
      { id: 'patient_records', name: 'Secure Health Records', iconName: 'Shield', description: 'Encrypted patient history and lab reports', enabledByDefault: true, category: 'core' }
    ],
    aiAssistant: {
      name: 'Healthcare AI Assistant',
      roleDescription: 'Provides general health triage information and OPD schedule guidance.',
      systemPrompt: 'You are the Hospital AI Assistant. Provide helpful non-diagnostic triage guidelines and appointment help.',
      suggestedPrompts: ['What are OPD visiting hours?', 'How to prepare for a blood test?', 'Draft appointment confirmation message']
    }
  },
  real_estate: {
    id: 'real_estate',
    slug: 'real-estate',
    title: 'Real Estate & Property',
    icon: 'Home',
    description: 'Project listings, site visit scheduling, channel partner CRM, and bookings.',
    estimatedMembers: '20 - 500 Agents & Clients',
    categoryTag: 'Property',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'builder', name: 'Developer / Builder', description: 'Project Owner', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'broker', name: 'Channel Partner / Broker', description: 'Property Agent', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'inventory_grid', name: 'Project Inventory Grid', iconName: 'Grid', description: 'Real-time available flats, plots, and commercial units', enabledByDefault: true, category: 'operations' },
      { id: 'site_visits', name: 'Site Visit Scheduler', iconName: 'Navigation', description: 'Book client site visits with vehicle pickup details', enabledByDefault: true, category: 'engagement' }
    ],
    aiAssistant: {
      name: 'Real Estate Sales AI',
      roleDescription: 'Generates property brochures, pitch decks, and client site visit follow-ups.',
      systemPrompt: 'You are the Real Estate Sales AI. Help agents write attractive property descriptions and site visit notes.',
      suggestedPrompts: ['Write brochure text for luxury 3BHK flat', 'Draft site visit confirmation message', 'Explain home loan tax benefits']
    }
  },
  restaurant: {
    id: 'restaurant',
    slug: 'restaurant',
    title: 'Restaurant & Cloud Kitchen',
    icon: 'Utensils',
    description: 'Table reservations, QR digital menu, kitchen order tickets, and delivery.',
    estimatedMembers: '10 - 100 Staff & Foodies',
    categoryTag: 'Hospitality',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'owner', name: 'Restaurant Owner / Manager', description: 'Full Access', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'chef', name: 'Head Chef', description: 'Kitchen Display Operator' },
      { id: 'customer', name: 'Customer / Guest', description: 'Dine-in or Online Guest', isDefault: true }
    ],
    features: [
      { id: 'qr_menu', name: 'QR Digital Menu & Orders', iconName: 'QrCode', description: 'Contactless table ordering and digital payment', enabledByDefault: true, category: 'finance' },
      { id: 'kitchen_kot', name: 'Kitchen Order Display (KOD)', iconName: 'ChefHat', description: 'Live order queue for kitchen staff', enabledByDefault: true, category: 'operations' }
    ],
    aiAssistant: {
      name: 'Restaurant Menu AI',
      roleDescription: 'Drafts special menu dish descriptions, forecasts ingredient demand, and writes promotional posts.',
      systemPrompt: 'You are the Restaurant AI Assistant. Help write mouth-watering dish descriptions and special weekend offers.',
      suggestedPrompts: ['Write appetizing description for signature dish', 'Draft a weekend chef special offer', 'Ideas for monsoon food festival']
    }
  },
  temple_trust: {
    id: 'temple_trust',
    slug: 'temple-trust',
    title: 'Temple / Trust / Devotional',
    icon: 'Sun',
    description: 'Devotional donations, Annadan, festival events, receipts, and live darshan.',
    estimatedMembers: '100 - 50000 Devotees',
    categoryTag: 'Spiritual',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'trustee', name: 'Managing Trustee', description: 'Trust President', canManageSettings: true, canManageMembers: true, canManagePayments: true },
      { id: 'sevak', name: 'Sevak / Priest', description: 'Rituals & Annadan In-charge' },
      { id: 'bhakt', name: 'Devotee / Bhakt', description: 'Community Member', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'pooja_booking', name: 'Online Pooja & Donation', iconName: 'Heart', description: 'Digital receipts for Mahaprasad and special Poojas', enabledByDefault: true, category: 'finance' },
      { id: 'live_darshan', name: 'Live Darshan & Aarti Stream', iconName: 'Video', description: 'Broadcast daily morning and evening Aarti', enabledByDefault: true, category: 'engagement' }
    ],
    aiAssistant: {
      name: 'Devotional Trust AI',
      roleDescription: 'Provides festival pooja timings, drafts donor thank you receipts, and schedules live darshan.',
      systemPrompt: 'You are the Temple Trust AI Assistant. Draft respectful devotional greetings and festival information.',
      suggestedPrompts: ['Write thank you message for Annadan donor', 'Draft Aarti schedule notice for Janmashtami', 'Devotional invitation message']
    }
  },
  general: {
    id: 'general',
    slug: 'general',
    title: 'General Community',
    icon: 'Users',
    description: 'Standard open social group for discussion, sharing posts, chat, and media.',
    estimatedMembers: 'Unlimited',
    categoryTag: 'Community',
    defaultPrivacy: 'public',
    defaultSearchable: true,
    roles: [
      { id: 'admin', name: 'Group Admin', description: 'Group Creator', canManageSettings: true, canManageMembers: true },
      { id: 'moderator', name: 'Moderator', description: 'Content Reviewer' },
      { id: 'member', name: 'Member', description: 'Community Member', isDefault: true, canPostContent: true }
    ],
    features: [
      { id: 'group_posts', name: 'Feed & Discussions', iconName: 'MessageSquare', description: 'Share images, videos, and thoughts', enabledByDefault: true, category: 'core' },
      { id: 'group_chat', name: 'Group Chat Room', iconName: 'Send', description: 'Real-time group chat and media sharing', enabledByDefault: true, category: 'core' }
    ],
    aiAssistant: {
      name: 'Community Assistant AI',
      roleDescription: 'General AI Assistant for group discussions, topic suggestions, and post creation.',
      systemPrompt: 'You are the General Community AI Assistant. Help members write engaging posts and answer queries.',
      suggestedPrompts: ['Suggest discussion topic for group', 'Write welcome post for new members', 'Draft a weekend group poll']
    }
  }
};

/**
 * Get Tolee Type Config by ID or Slug, falling back to General
 */
export function getToleeTypeConfig(typeOrCategory?: string | null): ToleeTypeConfig {
  if (!typeOrCategory) return TOLEE_TYPE_REGISTRY.general;
  const normalized = typeOrCategory.toLowerCase().trim().replace(/[-\s]+/g, '_');
  
  if (TOLEE_TYPE_REGISTRY[normalized]) {
    return TOLEE_TYPE_REGISTRY[normalized];
  }

  // Find by slug
  const matched = Object.values(TOLEE_TYPE_REGISTRY).find(
    (t) => t.slug === typeOrCategory || t.id === normalized
  );

  return matched || TOLEE_TYPE_REGISTRY.general;
}
