import React, { createContext, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Create context
export const AlertContext = createContext();

// Initial state
const initialState = [];

// Reducer
const alertReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ALERT':
      return [...state, action.payload];
    case 'REMOVE_ALERT':
      return state.filter(alert => alert.id !== action.payload);
    default:
      return state;
  }
};

// Provider component
export const AlertProvider = ({ children }) => {
  const [state, dispatch] = useReducer(alertReducer, initialState);

  // Set alert
  const setAlert = (msg, severity = 'info', timeout = 5000) => {
    const id = uuidv4();
    
    dispatch({
      type: 'SET_ALERT',
      payload: { msg, severity, id }
    });

    setTimeout(() => dispatch({ type: 'REMOVE_ALERT', payload: id }), timeout);
    
    return id;
  };

  // Remove alert
  const removeAlert = (id) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  };

  // Set success alert
  const setSuccessAlert = (msg, timeout = 5000) => {
    return setAlert(msg, 'success', timeout);
  };

  // Set error alert
  const setErrorAlert = (msg, timeout = 5000) => {
    return setAlert(msg, 'error', timeout);
  };

  // Set warning alert
  const setWarningAlert = (msg, timeout = 5000) => {
    return setAlert(msg, 'warning', timeout);
  };

  // Set info alert
  const setInfoAlert = (msg, timeout = 5000) => {
    return setAlert(msg, 'info', timeout);
  };

  return (
    <AlertContext.Provider
      value={{
        alerts: state,
        setAlert,
        removeAlert,
        setSuccessAlert,
        setErrorAlert,
        setWarningAlert,
        setInfoAlert
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};
