export type ProductCategory =
  | "impressoras"
  | "filamentos"
  | "pecas"
  | "hardware"
  | "acessorios"
  | "resinas";

export type DigitalCategory =
  | "stl"
  | "obj"
  | "step"
  | "gcode"
  | "bundle";

export interface Seller {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  totalSales: number;
  verified: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: ProductCategory;
  seller: Seller;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  freeShipping: boolean;
  condition: "new" | "used";
  createdAt: string;
}

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  previewImages: string[];
  category: DigitalCategory;
  formats: string[];
  seller: Seller;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  printDifficulty: "easy" | "medium" | "hard" | "expert";
  supportRequired: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  targetScreen: string;
}
