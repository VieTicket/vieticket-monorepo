"use client";

import { Plus, Star, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface WelcomeScreenProps {
  onShowTemplates: () => void;
}

export function WelcomeScreen({ onShowTemplates }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <Layers className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Seat Map Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Create custom seat maps for your events or browse community templates
          to get started quickly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/seat-map">
            <Button size="lg">
              <Plus size={16} className="mr-2" />
              Create New Seat Map
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={onShowTemplates}>
            <Star size={16} className="mr-2" />
            Browse Templates
          </Button>
        </div>
      </div>
    </div>
  );
}
