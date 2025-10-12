"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface Props {
  selectedPriceRange: string;
  selectedDate: string;
  selectedLocation: string;
  selectedCategory: string;
  onChange: (key: string, value: string) => void;
}

export default function EventFiltersSidebar({
  selectedPriceRange,
  selectedDate,
  selectedLocation,
  selectedCategory,
  onChange,
}: Props) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const t = useTranslations("event-sidebar");

  const priceOptions = t.raw("priceOptions") as {
    label: string;
    value: string;
  }[];

  const dateOptions = t.raw("dateOptions") as {
    label: string;
    value: string;
  }[];

  const categoryOptions = t.raw("categoryOptions") as {
    label: string;
    value: string;
  }[];

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
