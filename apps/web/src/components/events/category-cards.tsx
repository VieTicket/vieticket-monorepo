"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
      className="flex flex-col items-center text-center w-28 md:w-32 cursor-pointer group"
    >
      <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-violet-400/30 border-2 border-slate-700/30 group-hover:border-violet-400/50">
        <Image src={imageUrl} alt={title} className="object-cover transition-transform duration-300 group-hover:scale-105" fill />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <p className="mt-3 text-xs md:text-sm font-medium text-white group-hover:text-violet-300 transition-colors duration-300  px-3 py-1   group-hover:border-violet-400/50">
        {title}
      </p>
    </div>
  );
};

export default function CategoryList() {
  const t = useTranslations("home")
  const categories = [
  {
    title: t("categories.types.Entertainment"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091047/e336de09-2f3a-4575-bdb1-4c1692e60ef0.png",
  },
  {
    title: t("categories.types.Technology & Innovation"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093218/11f6010a-49ff-4a7d-bda5-8c8b612ac54a.png",
  },
  {
    title: t("categories.types.Business"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091186/d2ce054c-a7f7-4b10-9636-628d50ed8fef.png",
  },
  {
    title: t("categories.types.Cultural & Arts"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753091193/d2b15a65-0dc6-48b4-80ab-cc791764bc52.png",
  },
  {
    title: t("categories.types.Sports & Fitness"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093166/066bc76b-201a-4757-94be-1130e5d21653.png",
  },
  {
    title: t("categories.types.Competition & Game shows"),
    imageUrl:
      "https://res.cloudinary.com/dhkvj3h7q/image/upload/v1753093221/326d759b-4b52-4abb-8b6b-72af066af729.png",
  },
];
  return (
    <section >
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center glow-text">
        <div className="bg-gradient-to-r from-violet-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
          {t("categories.title")}
        </div>
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
