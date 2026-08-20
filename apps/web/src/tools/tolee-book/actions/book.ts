'use server';

import { searchOpenLibraryBooks } from '../services/bookService';
import { BookItem } from '../types/book.types';

export async function searchBooksAction(query: string): Promise<{ success: boolean; books: BookItem[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
      // Default curated books
      const defaultBooks = await searchOpenLibraryBooks('philosophy literature science technology');
      return { success: true, books: defaultBooks };
    }
    const books = await searchOpenLibraryBooks(query);
    return { success: true, books };
  } catch (error) {
    console.error('[Tolee Book Action] Error searching books:', error);
    return { success: false, books: [], error: 'Failed to search books' };
  }
}
