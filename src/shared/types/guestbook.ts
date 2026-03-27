export interface GuestbookComment {
  id: string;
  guestbookId: string;
  name: string;
  message: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  comments?: GuestbookComment[];
}

export interface CreateGuestbookEntry {
  name: string;
  message: string;
}

export interface CreateGuestbookComment {
  guestbookId: string;
  name: string;
  message: string;
}

export interface GuestbookResponse {
  success: boolean;
  message?: string;
  data?: GuestbookEntry[];
}

export interface GuestbookCommentResponse {
  success: boolean;
  message?: string;
  data?: GuestbookComment[];
}
