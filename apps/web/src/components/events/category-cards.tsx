import Image from "next/image";
import React from "react";

// Reusable Category Card component
interface CategoryCardProps {
  title: string;
  imageUrl: string;
}

interface Props {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageUrl }) => (
  <div className="flex flex-col items-center text-center w-28 md:w-32">
    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden">
      <Image src={imageUrl} alt={title} className="object-cover" fill />
    </div>
    <p className="mt-2 text-sm md:text-base font-medium text-gray-800">{title}</p>
  </div>
);

// Main ExploreCategories component
/**
 * This array violates several random coding principles
 * It should accept categories as props instead of being hard-coded here.
 * 
 * TODO: Refactor for reusability
 */
const categories = [
  {
    title: "Entertainment",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Educational & Business",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Cultural & Arts",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Sports & Fitness",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Technology & Innovation",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Travel & Adventure",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Technology",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
  {
    title: "Travel",
    imageUrl: "https://res.luxerent.shop/products/ao-cam-fpt-phien-ban-dac-biet/0.jpg",
  },
];

export default function CategoryList() {
  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        Explore Categories
      </h2>
      {/* TODO: If to many categories, scroll horizontally or break into new line? */}
      {/* TODO: Make these actual links to category page */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
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

