// hooks/useDeviceDetection.ts
import { useState, useEffect } from "react";

export const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen width
      const screenWidth = window.innerWidth;
      const isMobileScreen = screenWidth < 768; // Tailwind md breakpoint

      // Check user agent (optional, for more accuracy)
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );

      // Consider it mobile if either condition is true
      setIsMobile(isMobileScreen || isMobileUserAgent);
      setIsLoading(false);
    };

    checkDevice();

    // Listen for window resize
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return { isMobile, isLoading };
};
