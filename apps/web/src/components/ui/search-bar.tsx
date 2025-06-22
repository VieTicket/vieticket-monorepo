import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LucideSearch, MapPin } from "lucide-react";

// Replace with category or something else.
const locations = [
  "Thanh Hoá",
  "Nghệ An",
  "Hà Tĩnh",
];

export default function SearchBar() {
  return (
    <div className="flex items-center bg-white px-4 py-2 rounded-sm shadow-sm space-x-4 w-full lg:w-3/4 xl:w-2/3 mx-auto">
      {/* Search Input */}
      <div className="flex items-center space-x-2 flex-1">
        <LucideSearch className="w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search Events, Categories, Location,..."
          className="border-0 focus:ring-0 shadow-none"
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Location Selector */}
      <Select defaultValue={locations[0]}>
        <SelectTrigger className="flex items-center space-x-2 bg-transparent border-0 focus:ring-0 shadow-none">
          <MapPin className="w-5 h-5 text-gray-500" />
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {loc}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
