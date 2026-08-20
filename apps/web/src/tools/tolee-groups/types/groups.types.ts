export interface ToleeGroupItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  avatar?: string | null;
  coverImage?: string | null;
  membersCount: number;
  isPrivate: boolean;
  role?: string;
  createdAt: string | Date;
}
