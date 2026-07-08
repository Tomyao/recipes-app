import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Tracks navigator.onLine and shows a friendly toast on transitions. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasMounted = useRef(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (hasMounted.current) toast.success("Back online");
    }
    function handleOffline() {
      setIsOnline(false);
      if (hasMounted.current) {
        toast.warning("You're offline — showing cached recipes and favorites.");
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    hasMounted.current = true;

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
