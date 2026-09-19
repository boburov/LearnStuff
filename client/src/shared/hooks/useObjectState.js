// React
import { useState } from "react";

const useObjectState = (initialState = {}) => {
  const [state, setState] = useState(initialState);
  const [savedInitialState] = useState(initialState);

  const setField = (key, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const setFields = (updates = {}) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetState = () => setState(savedInitialState);

  return { ...state, state, setField, setFields, resetState };
};

export default useObjectState;
