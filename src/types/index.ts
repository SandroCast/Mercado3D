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
  /** CEP de origem do vendedor (8 dígitos, sem traço) */
  postalCode?: string;
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
  formatFiles: Record<string, string>;
  seller: Seller;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  printDifficulty: "easy" | "medium" | "hard" | "expert";
  supportRequired: boolean;
  license?: string;
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

export interface Address {
  recipientName: string;
  phone: string;       // 10-11 digits, no formatting
  postalCode: string;  // 8 digits, no dash
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;       // 2-letter UF
}

// Full DB record — extends Address with Supabase fields
export interface UserAddress extends Address {
  id: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ShippingOptionSummary {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryDays: string;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "credit_card" | "pix";

export interface ProductQuestion {
  id: string;
  productId: string;
  productType: "physical" | "digital";
  askerId: string;
  askerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  productType: "physical" | "digital";
  rating: number;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  type: "physical" | "digital";
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  sellerName: string;
  sellerId: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: PaymentMethod;
  shippingAddress?: Address;
  selectedShipping?: ShippingOptionSummary;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  createdAt: string;
}
