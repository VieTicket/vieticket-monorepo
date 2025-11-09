"use client";

import { useEffect, useState, useCallback } from "react";
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

  // Enhanced onChange handler that tracks AI behavior
  const handleFilterChange = useCallback((key: string, value: string) => {
    // Just call original onChange - let FilteredClientGrid handle tracking
    // to avoid double tracking and infinite loops
    onChange(key, value);
  }, [onChange]);

  useEffect(() => {
    async function fetchProvinces() {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist/tinh_tp.json"
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const provinceNames = Object.values(data).map((p: any) => p.name);
        setProvinces(provinceNames);
      } catch (error) {
        console.error("Failed to fetch provinces, using fallback:", error);
        // Fallback list of major Vietnamese provinces/cities
        const fallbackProvinces = [
          "Hà Nội",
          "Hồ Chí Minh",
          "Đà Nẵng",
          "Hải Phòng",
          "Cần Thơ",
          "An Giang",
          "Bà Rịa - Vũng Tàu",
          "Bắc Giang",
          "Bắc Kạn",
          "Bạc Liêu",
          "Bắc Ninh",
          "Bến Tre",
          "Bình Định",
          "Bình Dương",
          "Bình Phước",
          "Bình Thuận",
          "Cà Mau",
          "Cao Bằng",
          "Đắk Lắk",
          "Đắk Nông",
          "Điện Biên",
          "Đồng Nai",
          "Đồng Tháp",
          "Gia Lai",
          "Hà Giang",
          "Hà Nam",
          "Hà Tĩnh",
          "Hải Dương",
          "Hậu Giang",
          "Hòa Bình",
          "Hưng Yên",
          "Khánh Hòa",
          "Kiên Giang",
          "Kon Tum",
          "Lai Châu",
          "Lâm Đồng",
          "Lạng Sơn",
          "Lào Cai",
          "Long An",
          "Nam Định",
          "Nghệ An",
          "Ninh Bình",
          "Ninh Thuận",
          "Phú Thọ",
          "Phú Yên",
          "Quảng Bình",
          "Quảng Nam",
          "Quảng Ngãi",
          "Quảng Ninh",
          "Quảng Trị",
          "Sóc Trăng",
          "Sơn La",
          "Tây Ninh",
          "Thái Bình",
          "Thái Nguyên",
          "Thanh Hóa",
          "Thừa Thiên Huế",
          "Tiền Giang",
          "Trà Vinh",
          "Tuyên Quang",
          "Vĩnh Long",
          "Vĩnh Phúc",
          "Yên Bái"
        ];
        setProvinces(fallbackProvinces);
      }
    }
    fetchProvinces();
  }, []);


  return (
    <aside className="bg-white p-4 rounded shadow-md space-y-6 text-sm">
      {/* Price Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">{t("PriceRange")}</h3>
        {priceOptions.map(({ label, value }) => (
          <label key={value} className="block mb-1 cursor-pointer">
            <input
              type="radio"
              name="priceRange"
              value={value}
              checked={selectedPriceRange === value}
              onChange={() => handleFilterChange("price", value)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Date Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">{t("StartDate")}</h3>
        {dateOptions.map(({ label, value }) => (
          <label key={value} className="block mb-1 cursor-pointer">
            <input
              type="radio"
              name="date"
              value={value}
              checked={selectedDate === value}
              onChange={() => handleFilterChange("date", value)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Location Filter */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">{t("Location")}</h3>
        <Select
          value={selectedLocation}
          onValueChange={(val) => handleFilterChange("location", val)}
        >
          <SelectTrigger className="w-full border border-gray-300 rounded px-2 py-1">
            <SelectValue placeholder={t("AllLocation")} />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem value="all">{t("AllLocation")}</SelectItem>
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
        <h3 className="font-semibold text-gray-800 mb-2">{t("Category")}</h3>
        <Select
          value={selectedCategory}
          onValueChange={(val) => handleFilterChange("category", val)}
        >
          <SelectTrigger className="w-full border border-gray-300 rounded px-2 py-1">
            <SelectValue placeholder={t("categoryOptions.0.label")} />
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
