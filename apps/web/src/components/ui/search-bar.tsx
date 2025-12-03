"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
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

function SearchBarInner() {
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
    <div className="professional-card rounded-lg shadow-xl border border-slate-700/30 hover:border-violet-400/50 transition-all duration-300 p-4 sm:p-6 w-full max-w-4xl mx-auto backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
        {/* Search Input */}
        <div className="flex items-center space-x-3 flex-1 bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30 hover:border-violet-400/50 transition-all duration-300">
          <LucideSearch className="w-5 h-5 text-violet-400" />
          <Input
            type="text"
            placeholder={t("Searchevents")}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            className="bg-transparent border-0 focus:ring-0 shadow-none text-white placeholder-slate-400 text-sm sm:text-base"
          />
        </div>

        {/* Divider - Hidden on mobile */}
        <div className="hidden sm:block w-px h-6 bg-slate-700/50" />

        {/* Location Selector */}
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select value={location} onValueChange={handleLocationChange}>
            <SelectTrigger className="professional-button w-full flex items-center space-x-2 bg-slate-800/50 hover:bg-slate-700/50 text-white border-slate-700/30 rounded-lg px-4 py-3 h-auto min-h-[48px] transition-all duration-300">
              <MapPin className="w-5 h-5 text-violet-400" />
              <SelectValue placeholder="Chọn địa điểm" className="text-sm sm:text-base" />
            </SelectTrigger>
            <SelectContent className="professional-card border-slate-700/50 max-h-60 overflow-y-auto">
              <SelectItem key="all" value="all" className="text-white hover:bg-slate-700/50 focus:bg-slate-700/50">
                {t("AllLocation")}
              </SelectItem>
              {provinces.map((prov) => (
                <SelectItem key={prov} value={prov} className="text-white hover:bg-slate-700/50 focus:bg-slate-700/50">
                  {prov}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default function SearchBar() {
  return (
    <Suspense fallback={
      <div className="professional-card rounded-lg shadow-xl border border-slate-700/30 p-4 sm:p-6 w-full max-w-4xl mx-auto backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      </div>
    }>
      <SearchBarInner />
    </Suspense>
  );
}
