"use client";

// Client-side stand-in for the `smart_sorts` table (database/schema.sql).
// A real deployment persists these server-side per shopper_id; for this
// demo (no auth yet) each browser keeps its own saved sorts in localStorage
// so "shop in sort" is fully demonstrable end-to-end.

export interface SmartSortFilters {
  pincode: string;
  radiusKm: number;
  gender: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  sort?: string;
}

export interface SmartSort {
  id: string;
  name: string;
  filters: SmartSortFilters;
  createdAt: string;
}

const STORAGE_KEY = "sio:smart-sorts";

export function listSmartSorts(): SmartSort[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSmartSort(name: string, filters: SmartSortFilters): SmartSort {
  const sort: SmartSort = { id: crypto.randomUUID(), name, filters, createdAt: new Date().toISOString() };
  const all = listSmartSorts();
  all.unshift(sort);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return sort;
}

export function deleteSmartSort(id: string) {
  const all = listSmartSorts().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function filtersToQuery(filters: SmartSortFilters): string {
  const params = new URLSearchParams();
  params.set("pincode", filters.pincode);
  params.set("radius", String(filters.radiusKm));
  params.set("gender", filters.gender);
  if (filters.subCategory) params.set("subCategory", filters.subCategory);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.size) params.set("size", filters.size);
  if (filters.sort) params.set("sort", filters.sort);
  return params.toString();
}
