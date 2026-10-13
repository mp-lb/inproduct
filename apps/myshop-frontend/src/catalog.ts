import { slugify } from "@mp-lb/inproduct";

export type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  icon: string;
};
export type Cart = Record<string, number>;
export const seedProducts: Product[] = [
  {
    id: "mug",
    name: "Everyday mug",
    slug: slugify("Everyday mug"),
    price: 1800,
    icon: "☕",
  },
  {
    id: "tote",
    name: "Market tote",
    slug: slugify("Market tote"),
    price: 2400,
    icon: "👜",
  },
  {
    id: "notebook",
    name: "Field notebook",
    slug: slugify("Field notebook"),
    price: 1200,
    icon: "📒",
  },
  {
    id: "plant",
    name: "Desk plant",
    slug: slugify("Desk plant"),
    price: 1600,
    icon: "🪴",
  },
];
export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

// Uniqueness and validation belong to the application, not slugify.
export const saveProduct = (
  products: Product[],
  id: string,
  name: string,
  dollars: string,
): Product[] => {
  const slug = slugify(name);
  const amount = Number(dollars);
  if (!name.trim() || name.trim().length > 80 || !slug)
    throw new Error(
      "Use a name with letters or numbers (up to 80 characters).",
    );
  if (
    !/^\d+(\.\d{1,2})?$/.test(dollars) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10000
  )
    throw new Error(
      "Enter a price between $0.01 and $10,000, with at most two decimals.",
    );
  if (products.some((product) => product.id !== id && product.slug === slug))
    throw new Error(
      "Another product already uses this slug. Choose a different name.",
    );
  const previous = products.find((product) => product.id === id);

  const product = {
    id,
    name: name.trim(),
    slug,
    price: Math.round(amount * 100),
    icon: previous?.icon ?? "📦",
  };

  return previous
    ? products.map((entry) => (entry.id === id ? product : entry))
    : [...products, product];
};

export const cartLines = (products: Product[], cart: Cart) =>
  products
    .filter((product) => (cart[product.id] ?? 0) > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] ?? 0 }));
export const cartTotal = (products: Product[], cart: Cart) =>
  cartLines(products, cart).reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );
