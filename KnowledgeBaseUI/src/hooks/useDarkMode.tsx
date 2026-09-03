import { createContext, useContext } from 'react';

const DarkModeContext = createContext(false);

export const DarkModeProvider = DarkModeContext.Provider;

export const useDarkMode = () => useContext(DarkModeContext);
