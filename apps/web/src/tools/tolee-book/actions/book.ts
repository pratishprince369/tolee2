'use server';

import { searchFreeBooksMultiApi, getPopularBooksMultiApi, getBookPages, translateBookText } from '../services/bookService';
import { BookItem } from '../types/book.types';

export async function searchBooksAction(query: string, language: string = 'en'): Promise<{ success: boolean; books: BookItem[]; error?: string }> {
  try {
    if (!query || query.trim().length === 0) {
      const popular = await getPopularBooksMultiApi(language);
      return { success: true, books: popular };
    }
    const books = await searchFreeBooksMultiApi(query, language);
    return { success: true, books };
  } catch (error) {
    console.error('[Tolee Book Action] Error searching books:', error);
    return { success: false, books: [], error: 'Failed to search books' };
  }
}

export async function getPopularBooksAction(language: string = 'en'): Promise<{ success: boolean; books: BookItem[]; error?: string }> {
  try {
    const books = await getPopularBooksMultiApi(language);
    return { success: true, books };
  } catch (error) {
    console.error('[Tolee Book Action] Error fetching popular books:', error);
    return { success: false, books: [], error: 'Failed to load popular books' };
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

export async function translateBookPageAction(text: string, targetLang: string): Promise<{ success: boolean; translatedText: string }> {
  try {
    const translatedText = await translateBookText(text, targetLang);
    return {
      success: true,
      translatedText
    };
  } catch (error) {
    console.error('[Tolee Book Action] Error translating page:', error);
    return {
      success: false,
      translatedText: text
    };
  }
}
