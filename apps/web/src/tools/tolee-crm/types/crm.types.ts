export interface LeadContactItem {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags?: string[];
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  createdAt: string | Date;
}
