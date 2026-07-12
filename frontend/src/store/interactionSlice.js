import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createInteraction,
  listInteractions,
  updateInteraction,
  deleteInteraction,
} from "../api/client";

const initialFormState = {
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
};

export const submitInteraction = createAsyncThunk(
  "interactions/submit",
  async (formData) => {
    const saved = await createInteraction(formData);
    return saved;
  }
);

export const fetchInteractions = createAsyncThunk(
  "interactions/fetchAll",
  async () => {
    return await listInteractions();
  }
);

export const editInteraction = createAsyncThunk(
  "interactions/edit",
  async ({ id, data }) => {
    return await updateInteraction(id, data);
  }
);

export const removeInteraction = createAsyncThunk(
  "interactions/remove",
  async (id) => {
    await deleteInteraction(id);
    return id;
  }
);

const interactionSlice = createSlice({
  name: "interactions",
  initialState: {
    form: { ...initialFormState },
    list: [],
    lastSaved: null,
    aiSuggestedFollowups: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    updateField(state, action) {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    addMaterial(state, action) {
      state.form.materials_shared.push(action.payload);
    },
    removeMaterial(state, action) {
      state.form.materials_shared.splice(action.payload, 1);
    },
    addSample(state, action) {
      state.form.samples_distributed.push(action.payload);
    },
    removeSample(state, action) {
      state.form.samples_distributed.splice(action.payload, 1);
    },
    resetForm(state) {
      state.form = { ...initialFormState };
    },
    setAiSuggestedFollowups(state, action) {
      state.aiSuggestedFollowups = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitInteraction.pending, (state) => {
        state.status = "loading";
      })
      .addCase(submitInteraction.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastSaved = action.payload;
        state.aiSuggestedFollowups = action.payload.ai_suggested_followups || [];
        state.list.unshift(action.payload);
        state.form = { ...initialFormState };
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(editInteraction.fulfilled, (state, action) => {
        const idx = state.list.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(removeInteraction.fulfilled, (state, action) => {
        state.list = state.list.filter((i) => i.id !== action.payload);
      });
  },
});

export const {
  updateField,
  addMaterial,
  removeMaterial,
  addSample,
  removeSample,
  resetForm,
  setAiSuggestedFollowups,
} = interactionSlice.actions;

export default interactionSlice.reducer;
