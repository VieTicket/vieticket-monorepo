"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

// Reusable Category Card component
interface CategoryCardProps {
  title: string;
  imageUrl: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageUrl }) => {
  const router = useRouter();
  const handleCategoryParams = (title: string) => {
    return encodeURIComponent(title);
  };
  return (
    <div
      onClick={() =>
        router.push(`/events?category=${handleCategoryParams(title)}`)
      }
      className="flex flex-col items-center text-center w-28 md:w-32"
    >
      <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden">
        <Image src={imageUrl} alt={title} className="object-cover" fill />
      </div>
      <p className="mt-2 text-sm md:text-base font-medium text-gray-800">
        {title}
      </p>
    </div>
  );
};

const categories = [
  {
    title: "Entertainment",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091047/e336de09-2f3a-4575-bdb1-4c1692e60ef0.png",
  },
  {
    title: "Technology & Innovation",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093218/11f6010a-49ff-4a7d-bda5-8c8b612ac54a.png",
  },
  {
    title: "Business",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091186/d2ce054c-a7f7-4b10-9636-628d50ed8fef.png",
  },
  {
    title: "Cultural & Arts",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091193/d2b15a65-0dc6-48b4-80ab-cc791764bc52.png",
  },
  {
    title: "Sports & Fitness",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093166/066bc76b-201a-4757-94be-1130e5d21653.png",
  },
  {
    title: "Competition & Game shows",
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093221/326d759b-4b52-4abb-8b6b-72af066af729.png",
  },
];

export default function CategoryList() {
  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        Explore Categories
      </h2>
      <div className="flex flex-wrap justify-evenly gap-x-6 gap-y-8">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.title}
            title={cat.title}
            imageUrl={cat.imageUrl}
          />
        ))}
      </div>
    </section>
  );
}
