import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Item } from "../../../clients/FabricPlatformTypes";

interface VariableLibraryState {
  selectedVariableReference: string;
  resolvedVariableValue: string;
  isResolving: boolean;
  selectedItem: Item | null;
  selectedFilterTypes: string[];
  errorMessage: string;
  showError: boolean;
}

const initialState: VariableLibraryState = {
  selectedVariableReference: "",
  resolvedVariableValue: "",
  isResolving: false,
  selectedItem: null,
  selectedFilterTypes: [],
  errorMessage: "",
  showError: false,
};

export const variableLibrarySlice = createSlice({
  name: "variableLibrary",
  initialState,
  reducers: {
    setSelectedVariableReference: (state, action: PayloadAction<string>) => {
      state.selectedVariableReference = action.payload.trim();
    },
    setResolvedVariableValue: (state, action: PayloadAction<string>) => {
      state.resolvedVariableValue = action.payload;
    },
    setIsResolving: (state, action: PayloadAction<boolean>) => {
      state.isResolving = action.payload;
    },
    setSelectedItem: (state, action: PayloadAction<Item | null>) => {
      state.selectedItem = action.payload;
    },
    setSelectedFilterTypes: (state, action: PayloadAction<string[]>) => {
      state.selectedFilterTypes = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
      state.showError = true;
    },
    clearError: (state) => {
      state.errorMessage = "";
      state.showError = false;
    },
  },
});

export const {
  setSelectedVariableReference,
  setResolvedVariableValue,
  setIsResolving,
  setSelectedItem,
  setSelectedFilterTypes,
  setError,
  clearError,
} = variableLibrarySlice.actions;

export default variableLibrarySlice.reducer;
