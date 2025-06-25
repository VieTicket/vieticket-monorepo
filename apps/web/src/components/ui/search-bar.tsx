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

// Bỏ dấu và chuyển về chữ thường
function normalize(str: string) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Bỏ tiền tố "Tỉnh", "Thành phố"
function simplifyProvince(name: string) {
  return name.replace(/^(tỉnh|thành phố)\s+/i, "").trim();
}

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

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "all");
  const [provinces, setProvinces] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProvinces() {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/p");
        const data = await res.json();
        const simplified = data.map((prov: any) => simplifyProvince(prov.name));
        setProvinces(simplified);
      } catch (error) {
        console.error("Error loading provinces", error);
      }
    }
    fetchProvinces();
  }, []);

  const debouncedSearch = useRef(
    debounce((val: string, loc: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (val) {
        params.set("q", val);
      } else {
        params.delete("q");
      }

      if (loc && loc !== "all") {
        params.set("location", loc);
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
          placeholder="Search events..."
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
            All Locations
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