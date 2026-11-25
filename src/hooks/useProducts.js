import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productApi, attributeApi } from '../api/client';

// Stable query keys for catalog data (FE-07).
export const productKeys = {
  all: ['products'],
  list: (params = {}) => [
    'products',
    'list',
    { category: params.category || '', search: params.search || '' },
  ],
};

export const attributeKeys = {
  all: ['attributes'],
};

// Products list for the catalog. Reuses the existing api client unchanged;
// unwraps the { success, data } envelope exactly as the page did before
// (a non-success response yields an empty list, a thrown error surfaces
// as the query error).
export function useProducts(params = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const res = await productApi.getProducts(params);
      return res?.success ? res.data : [];
    },
    placeholderData: keepPreviousData,
  });
}

// All attributes (the catalog only reads `categories` from it, as before).
export function useAttributes() {
  return useQuery({
    queryKey: attributeKeys.all,
    queryFn: async () => {
      const res = await attributeApi.getAll();
      return res?.success ? res.data : null;
    },
  });
}

// Convenience wrapper matching what CatalogPage renders: just the categories.
export function useCategories() {
  const query = useAttributes();
  return {
    ...query,
    data: query.data?.categories ?? [],
  };
}
