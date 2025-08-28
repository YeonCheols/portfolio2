import {
  GuestbookEntry,
  CreateGuestbookEntry,
  GuestbookResponse,
  GuestbookComment,
  CreateGuestbookComment,
  GuestbookCommentResponse,
} from "@/common/types/guestbook";
import axios from "axios";

export const getGuestbookEntries = async (): Promise<GuestbookEntry[]> => {
  try {
    const response = await axios.get<GuestbookResponse>("/api/guestbook");
    return response.data.data || [];
  } catch (error) {
    console.error("방명록을 불러오는 중 오류가 발생했습니다:", error);
    return [];
  }
};

export const createGuestbookEntry = async (
  entry: CreateGuestbookEntry,
): Promise<boolean> => {
  try {
    const response = await axios.post<GuestbookResponse>(
      "/api/guestbook",
      entry,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.success;
  } catch (error) {
    console.error("방명록 작성 중 오류가 발생했습니다:", error);
    return false;
  }
};

export const getGuestbookComments = async (
  guestbookId: string,
): Promise<GuestbookComment[]> => {
  try {
    const response = await axios.get<GuestbookCommentResponse>(
      `/api/guestbook/${guestbookId}/comments`,
    );
    return response.data.data || [];
  } catch (error) {
    console.error("댓글을 불러오는 중 오류가 발생했습니다:", error);
    return [];
  }
};

export const createGuestbookComment = async (
  comment: CreateGuestbookComment,
): Promise<boolean> => {
  try {
    const response = await axios.post<GuestbookCommentResponse>(
      `/api/guestbook/${comment.guestbookId}/comments`,
      comment,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.success;
  } catch (error) {
    console.error("댓글 작성 중 오류가 발생했습니다:", error);
    return false;
  }
};
