import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // structured form fields
  form: {
    hcp_name: "",
    interaction_type: "Meeting",
    interaction_date: "",
    interaction_time: "",
    attendees: "",
    topics_discussed: "",
    materials_shared: [],
    samples_distributed: [],
    sentiment: "Neutral",
    outcomes: "",
    follow_up_actions: "",
  },

  // chat panel
  chatMessages: [], // { from: "user" | "ai", text: "" }
  chatInput: "",

  // saved interactions list
  interactions: [],

  // individual tool tester (for demo purposes)
  toolInput: "",
  toolOutput: "",

  // edit tester
  editTargetId: "",
  editRequest: "",

  loading: false,
};

const interactionSlice = createSlice({
  name: "interaction",
  initialState,
  reducers: {
    setFormField: (state, action) => {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    resetForm: (state) => {
      state.form = initialState.form;
    },
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload);
    },
    setChatInput: (state, action) => {
      state.chatInput = action.payload;
    },
    setInteractions: (state, action) => {
      state.interactions = action.payload;
    },
    setToolInput: (state, action) => {
      state.toolInput = action.payload;
    },
    setToolOutput: (state, action) => {
      state.toolOutput = action.payload;
    },
    setEditTargetId: (state, action) => {
      state.editTargetId = action.payload;
    },
    setEditRequest: (state, action) => {
      state.editRequest = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setFormField,
  resetForm,
  addChatMessage,
  setChatInput,
  setInteractions,
  setToolInput,
  setToolOutput,
  setEditTargetId,
  setEditRequest,
  setLoading,
} = interactionSlice.actions;

export default interactionSlice.reducer;