
import { collection, getDocs } from "firebase/firestore";

import { db } from "../config/firebase";
import type { Product } from "../types/product";

export async function getProducts(): Promise<Product[]> {
  const productsCollection = collection(db, "products");

  const snapshot = await getDocs(productsCollection);

  const products: Product[] = snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      category: data.category,
      rating: data.rating ?? 0,
      imageUrl: data.imageUrl ?? "",
    };
  });

  return products;
}
