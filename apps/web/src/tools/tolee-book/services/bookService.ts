import { BookItem } from '../types/book.types';

/**
 * Tolee Book Service
 * Connects to OpenLibrary and public domain sources for book reading and discovery.
 */
export async function searchOpenLibraryBooks(query: string): Promise<BookItem[]> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://openlibrary.org/search.json?q=${encoded}&limit=12`, {
      headers: { 'User-Agent': 'ToleeBookApp/1.0' },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.docs || []).map((doc: any) => {
      const coverId = doc.cover_i;
      const coverImage = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : null;

      return {
        id: doc.key?.replace('/works/', '') || doc.cover_edition_key || Math.random().toString(),
        title: doc.title,
        author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
        coverImage,
        category: doc.subject ? doc.subject[0] : 'General',
        language: doc.language ? doc.language[0] : 'en',
        totalPages: doc.number_of_pages_median || 250,
        publishedYear: doc.first_publish_year,
        rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : 4.5
      };
    });
  } catch (error) {
    console.error('[Tolee Book] Error searching books:', error);
    return [];
  }
}
