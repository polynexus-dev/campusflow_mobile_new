import httpClient from "@services/api/httpClient";

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  total_copies: number;
  available_copies: number;
}

export interface BookIssue {
  id: number;
  book_copy: number;
  book_title: string;
  barcode: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  fine_amount: string;
  status: string;
}

export const libraryApi = {
  getBooks: async (): Promise<Book[]> => {
    const res = await httpClient.get("api/books/");
    return res.data;
  },

  getMyIssuedBooks: async (): Promise<BookIssue[]> => {
    const res = await httpClient.get("api/book-issues/");
    return res.data;
  },
};
