interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  showNumber = true,
  className = ""
}: RatingStarsProps) {
  const stars = [];

  // Create all stars
  for (let i = 0; i < maxRating; i++) {
    const isFilled = i < rating;
    const starClass = isFilled ? "text-yellow-400" : "text-gray-300";
    
    stars.push(
      <span key={i} className={starClass}>
        ★
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {stars}
      </div>
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
