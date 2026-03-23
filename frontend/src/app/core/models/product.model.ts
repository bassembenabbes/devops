export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrls: string[];
  attributes: Record<string, string>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface ProductPage {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
export interface ProductFilter {
  category?: string;
  search?: string;
  page: number;
  size: number;
  sort: string;
}
