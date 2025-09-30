import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = (): [Theme, (theme: Theme) => void] => {
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('color-theme');
        if (storedTheme) {
            return storedTheme as Theme;
        } else {
            return 'light'; // Default to light theme if not found in localStorage
        }
    });

    useEffect(() => {
        localStorage.setItem('color-theme', theme);
    }, [theme]);

    return [theme, setTheme];
};

