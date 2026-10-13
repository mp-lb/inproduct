import { useState } from "react";
import type { FileStorageClient } from "@mp-lb/inproduct-storage";
import { files as defaultFiles } from "./files";
import { FileStorageSection } from "./FileStorageSection";
import { seedProducts, type Cart, type Product } from "./catalog";
import { ProductGrid } from "./ProductGrid";
import { CartPanel } from "./CartPanel";
import { ProductAdmin } from "./ProductAdmin";

export const MyShop = ({
  files = defaultFiles,
}: {
  files?: FileStorageClient;
}) => {
  const [adminSection, setAdminSection] = useState<"products" | "files">(
    "products",
  );

  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [cart, setCart] = useState<Cart>({});
  const [view, setView] = useState<"store" | "admin">("store");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState("");

  const changeQuantity = (id: string, amount: number) =>
    setCart((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(99, (current[id] ?? 0) + amount)),
    }));

  return (
    <>
      <div className="banner">
        LOCAL DEMO · Synthetic products · No payments
      </div>
      <header>
        <a className="brand" href="#" onClick={() => setView("store")}>
          ◈ MyShop
        </a>
        <nav aria-label="Shop navigation">
          <button
            className={view === "store" ? "" : "secondary"}
            onClick={() => setView("store")}
          >
            Storefront
          </button>
          <button
            className={view === "admin" ? "" : "secondary"}
            onClick={() => setView("admin")}
          >
            Admin
          </button>
        </nav>
      </header>
      <main>
        <p className="eyebrow">SMALL THINGS, EVERY DAY</p>
        <h1>
          {view === "store"
            ? "A little shop. All yours."
            : "Shop administration."}
        </h1>
        <p className="intro">
          {view === "store"
            ? "Thoughtful essentials for your daily rituals. A tiny storefront powered by your own application."
            : "Manage your catalog and files in one place."}
        </p>
        <p className="notice" role="status">
          {notice}
        </p>
        {view === "store" ? (
          <div className="shop-layout">
            <ProductGrid
              products={products}
              addToCart={(product) => {
                changeQuantity(product.id, 1);
                setNotice(`${product.name} added to cart.`);
              }}
            />
            <CartPanel
              products={products}
              cart={cart}
              setCart={setCart}
              changeQuantity={changeQuantity}
              setNotice={setNotice}
            />
          </div>
        ) : (
          <>
            <nav className="admin-navigation" aria-label="Admin sections">
              <button
                className={adminSection === "products" ? "" : "secondary"}
                aria-pressed={adminSection === "products"}
                onClick={() => setAdminSection("products")}
              >
                Manage products
              </button>
              <button
                className={adminSection === "files" ? "" : "secondary"}
                aria-pressed={adminSection === "files"}
                onClick={() => setAdminSection("files")}
              >
                File storage
              </button>
            </nav>
            {adminSection === "files" ? (
              <FileStorageSection client={files} />
            ) : (
              <ProductAdmin
                products={products}
                setProducts={setProducts}
                setCart={setCart}
                editing={editing}
                setEditing={setEditing}
                setNotice={setNotice}
              />
            )}
          </>
        )}
      </main>
      <footer>
        <p>
          InProduct provides slugs and file storage. Catalog and cart behavior
          are example application code.
          <br />
          Catalog and cart changes live in this tab. Reset restores the seed
          products. Files are saved by the local backend and survive reloads and
          resets.
        </p>
        <button
          className="secondary"
          onClick={() => {
            setAdminSection("products");
            setProducts(seedProducts);
            setCart({});
            setEditing(null);
            setNotice(
              "Demo reset. Products restored; stored files are unchanged.",
            );
          }}
        >
          Reset demo
        </button>
      </footer>
    </>
  );
};
