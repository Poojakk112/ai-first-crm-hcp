import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { logViaChat } from "../api/client";

export const sendChatMessage = createAsyncThunk(
  "chat/send",
  async (message) => {
    const result = await logViaChat(message);
    return { message, result };
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [], // { role: 'user' | 'assistant', text }
    draft: "",
    status: "idle",
  },
  reducers: {
    setDraft(state, action) {
      state.draft = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state, action) => {
        state.status = "loading";
        state.messages.push({ role: "user", text: action.meta.arg });
        state.draft = "";
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.messages.push({
          role: "assistant",
          text: action.payload.result.reply,
          interaction: action.payload.result.interaction,
        });
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.status = "failed";
        state.messages.push({
          role: "assistant",
          text: "Sorry, something went wrong logging that interaction.",
        });
      });
  },
});

export const { setDraft } = chatSlice.actions;
export default chatSlice.reducer;
