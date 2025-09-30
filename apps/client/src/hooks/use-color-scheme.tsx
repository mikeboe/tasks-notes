import { useEffect, useState } from "react";

export const useColorScheme = () => {
  const [theme, setTheme] = useState("light");

  const colorTheme = () => {
    if (localStorage.getItem("color-theme") === "dark") {
      // setDark(true)
      setTheme("dark");
    }
    if (localStorage.getItem("color-theme") === "light") {
      // setDark(false)
      setTheme("light");
    }
  };

  useEffect(() => {
    colorTheme();
    // document.body.classList.add('h-full', 'bg-white', 'dark:bg-gray-950');
    // eslint-disable-next-line
  }, []);

  const updateColorTheme = () => {
    if (theme === "dark") {
      // setDark(true)
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-color-mode", "dark");
      // localStorage.removeItem('color-theme', 'light')
      localStorage.setItem("color-theme", "dark");
    }
    if (theme === "light") {
      // setDark(false)
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-color-mode", "light");
      // localStorage.removeItem('color-theme', 'dark')
      localStorage.setItem("color-theme", "light");
    }
  };

  useEffect(() => {
    updateColorTheme();
    // eslint-disable-next-line
  }, [theme]);

  return { theme, setTheme };
};
