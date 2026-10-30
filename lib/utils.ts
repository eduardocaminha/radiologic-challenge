import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Sem isto o merge lê os tokens de tipo como cor e descarta a classe.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-lg", "display-md", "display-sm", "headline-lg", "headline-md", "title-lg", "title-md", "title-sm", "body-lg", "label-lg", "label-md"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
