"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Props {
  selectedPriceRange: string;
  selectedDate: string;
  selectedLocation: string;
  selectedCategory: string;
  onChange: (key: string, value: string) => void;
}

const priceOptions = [
  { label: "Under 500.000₫", value: "lt500k" },
  { label: "500.000₫ - 1.000.000₫", value: "500k-1m" },
  { label: "1.000.000₫ - 3.000.000₫", value: "1m-3m" },
  { label: "3.000.000₫ - 5.000.000₫", value: "3m-5m" },
  { label: "Over 5.000.000₫", value: "gt5m" },
];

const dateOptions = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "thisWeek" },
];

const categoryOptions = [
  { label: "All Categories", value: "all" },
  { label: "Entertainment", value: "Entertainment" },
  { label: "Technology & Innovation", value: "Technology & Innovation" },
  { label: "Business", value: "Business" },
  { label: "Cultural & Arts", value: "Cultural & Arts" },
  { label: "Sports & Fitness", value: "Sports & Fitness" },
  { label: "Competition & Game shows", value: "Competition & Game shows" },
];

function simplifyProvince(name: string) {
  return name.replace(/^(tỉnh|thành phố)\s+/i, "").trim();
}

export default function EventFiltersSidebar({
  selectedPriceRange,
  selectedDate,
  selectedLocation,
  selectedCategory,
  onChange,
}: Props) {
  const [provinces, setProvinces] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProvinces() {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/p");
        const data = await res.json();
        setProvinces(data.map((prov: any) => simplifyProvince(prov.name)));
      } catch (error) {
        console.error("Lỗi khi tải danh sách tỉnh/thành", error);
      }
    }
    fetchProvinces();
  }, []);

  return (
    <aside className="bg-white p-4 rounded shadow-md space-y-6 text-sm">
      {/* Price Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Price Range</h3>
        {priceOptions.map(({ label, value }) => (
          <label key={value} className="block mb-1 cursor-pointer">
            <input
              type="radio"
              name="priceRange"
              value={value}
              checked={selectedPriceRange === value}
              onChange={() => onChange("price", value)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Date Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Start Date</h3>
        {dateOptions.map(({ label, value }) => (
          <label key={value} className="block mb-1 cursor-pointer">
            <input
              type="radio"
              name="date"
              value={value}
              checked={selectedDate === value}
              onChange={() => onChange("date", value)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Location Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Location</h3>
        <Select
          value={selectedLocation}
          onValueChange={(val) => onChange("location", val)}
        >
          <SelectTrigger className="w-full border border-gray-300 rounded px-2 py-1">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">All Locations</SelectItem>
            {provinces.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">Category</h3>
        <Select
          value={selectedCategory}
          onValueChange={(val) => onChange("category", val)}
        >
          <SelectTrigger className="w-full border border-gray-300 rounded px-2 py-1">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            {categoryOptions.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
