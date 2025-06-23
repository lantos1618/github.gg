import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStars(stars: number): string {
  if (stars >= 1_000_000) {
    const millions = stars / 1_000_000;
    return `${millions.toFixed(millions < 10 ? 1 : 0)}M`;
  }
  if (stars >= 1_000) {
    const thousands = stars / 1_000;
    return `${thousands.toFixed(thousands < 10 ? 1 : 0)}k`;
  }
  return stars.toString();
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
