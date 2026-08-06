import { redirect } from 'next/navigation';

export default function CreateNewsPage() {
  redirect('/news?create=true');
}
