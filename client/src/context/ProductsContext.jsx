import { createContext, useCallback, useContext, useRef, useState } from "react";
import { api } from "../api/client";

// The backend only exposes GET /api/products (paginated, published items
// only) — there's no GET /api/products/:id endpoint. This context caches
// every product page we've fetched so product detail pages can look items
// up by id without re-fetching, and falls back to walking pages if needed.
const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const cache = useRef(new Map());
  const [version, setVersion] = useState(0);

  const fetchPage = useCallback(async (page = 1) => {
    const res = await api.getProducts(page);
    const { products, totalPages, currentPage } = res.data;
    products.forEach((p) => cache.current.set(p._id, p));
    setVersion((v) => v + 1);
    return { products, totalPages, currentPage };
  }, []);

  const getById = useCallback(
    async (id) => {
      if (cache.current.has(id)) return cache.current.get(id);
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const res = await fetchPage(page);
        totalPages = res.totalPages || 1;
        if (cache.current.has(id)) return cache.current.get(id);
        page += 1;
      }
      return null;
    },
    [fetchPage]
  );

  return (
    <ProductsContext.Provider value={{ fetchPage, getById, cacheVersion: version }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
