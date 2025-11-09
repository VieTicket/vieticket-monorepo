"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LucideSearch, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useUserTracking } from "@/hooks/use-user-tracking";
import { authClient } from '@/lib/auth/auth-client';

// Debounce
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  } as T;
}

export default function SearchBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackSearch } = useUserTracking();
  const { data: session } = authClient.useSession();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "all");
  const [provinces, setProvinces] = useState<string[]>([]);
  const t = useTranslations("event-sidebar");

  // Helper function to clear user-specific AI cache
  const clearUserSpecificCache = () => {
    if (typeof window !== 'undefined') {
      const userId = session?.user?.id || null;
      const userSuffix = userId ? `_${userId}` : '_anonymous';
      localStorage.removeItem(`vieticket_recommendations${userSuffix}`);
      localStorage.removeItem(`vieticket_behavior_hash${userSuffix}`);
    }
  };

  useEffect(() => {
    async function fetchProvinces() {
      const res = await fetch(
        "https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist/tinh_tp.json"
      );
      const data = await res.json();
      setProvinces(Object.values(data).map((p: any) => p.name));
    }
    fetchProvinces();
  }, []);


  const debouncedSearch = useRef(
    debounce((val: string, loc: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (val) {
        params.set("q", val);
        // Track search query for AI
        trackSearch(val);
        
        // Clear AI cache để force refresh recommendations (user-specific)
        clearUserSpecificCache();
      } else {
        params.delete("q");
      }

      if (loc && loc !== "all") {
        params.set("location", loc);
        // Track location selection for AI
        trackSearch(`location:${loc}`);
        
        // Clear AI cache (user-specific)
        clearUserSpecificCache();
      } else {
        params.delete("location");
      }

      router.replace(`?${params.toString()}`);
    }, 500)
  ).current;

  const handleInputChange = (val: string) => {
    setQuery(val);
    debouncedSearch(val, location);
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    debouncedSearch(query, val);
  };

  return (
    <div className="flex items-center bg-white px-4 py-2 rounded-sm shadow-sm space-x-4 w-full lg:w-3/4 xl:w-2/3 mx-auto">
      {/* Search Input */}
      <div className="flex items-center space-x-2 flex-1">
        <LucideSearch className="w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder={t("Searchevents")}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="border-0 focus:ring-0 shadow-none"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Location Selector */}
      <Select value={location} onValueChange={handleLocationChange}>
        <SelectTrigger className="flex items-center space-x-2 bg-transparent border-0 focus:ring-0 shadow-none">
          <MapPin className="w-5 h-5 text-gray-500" />
          <SelectValue placeholder="Chọn địa điểm" />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          <SelectItem key="all" value="all">
            {t("AllLocation")}
          </SelectItem>
          {provinces.map((prov) => (
            <SelectItem key={prov} value={prov}>
              {prov}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}