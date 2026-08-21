'use server';

import { searchOpenLibraryBooks, getBookPages } from '../services/bookService';
import { BookItem } from '../types/book.types';

export async function searchBooksAction(query: string): Promise<{ success: boolean; books: BookItem[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
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

export async function getBookPagesAction(bookId: string, title?: string): Promise<{ success: boolean; pages: string[]; totalPages: number }> {
  try {
    const pages = await getBookPages(bookId, title);
    return {
      success: true,
      pages,
      totalPages: pages.length
    };
  } catch (error) {
    console.error('[Tolee Book Action] Error getting pages:', error);
    return {
      success: false,
      pages: ['Chapter 1\n\nContent could not be loaded at this time. Please try again.'],
      totalPages: 1
    };
  }
}
