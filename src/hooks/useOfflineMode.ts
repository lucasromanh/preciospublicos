import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";

export function useOfflineMode() {
  const { setOffline } = useAppContext();
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOffline]);
}
