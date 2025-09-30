import { useEffect, useState } from "react";

export const useSidebarStatus = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);

  useEffect(() => {
    sidebarStatus();
    // @eslint-disable-next-line
  }, [, sidebarExpanded]);

  const sidebarStatus = () => {
    if (!localStorage.getItem("sidebar")) {
      setSidebarExpanded(true);
      document.getElementById("sidebar")?.classList.remove("lg:w-16");
      document.getElementById("sidebar")?.classList.add("lg:w-56");
      document.getElementById("contentContainer")?.classList.remove("lg:pl-16");
      document.getElementById("contentContainer")?.classList.add("lg:pl-56");
    }

    if (localStorage.getItem("sidebar") === "true") {
      setSidebarExpanded(true);
      document.getElementById("sidebar")?.classList.remove("lg:w-16");
      document.getElementById("sidebar")?.classList.add("lg:w-56");
      document.getElementById("contentContainer")?.classList.remove("lg:pl-16");
      document.getElementById("contentContainer")?.classList.add("lg:pl-56");
    }
    if (localStorage.getItem("sidebar") === "false") {
      setSidebarExpanded(false);
      document.getElementById("sidebar")?.classList.add("lg:w-16");
      document.getElementById("sidebar")?.classList.remove("lg:w-56");
      document.getElementById("contentContainer")?.classList.add("lg:pl-16");
      document.getElementById("contentContainer")?.classList.remove("lg:pl-56");
    }
  };

  return { sidebarExpanded, setSidebarExpanded };
};
