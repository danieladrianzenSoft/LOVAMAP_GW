import { ImageCategory } from "../models/image";

export function parseImageCategory(category: string): ImageCategory {
    return ImageCategory[category as keyof typeof ImageCategory];
}