import axios from "axios";

export const sendMessage = async (prompt: string) => {
  try {
    const response = await axios.post("/api/chat", {
      prompt,
    });

    const data = response.data;

    return data?.reply;
  } catch (error) {
    return "";
  }
};
