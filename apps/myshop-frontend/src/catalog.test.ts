import { describe, expect, it } from "vitest";
import { cartLines, cartTotal, saveProduct, seedProducts } from "./catalog";

describe("MyShop catalog", () => {
  it("creates and renames products using the published library's slug rules", () => {
    const products = saveProduct(
      seedProducts,
      "new",
      "  Summer Bag! ",
      "12.34",
    );

    expect(products.at(-1)).toMatchObject({
      name: "Summer Bag!",
      slug: "summer-bag",
      price: 1234,
    });

    expect(
      saveProduct(products, "new", "Winter bag", "20").at(-1),
    ).toMatchObject({ id: "new", slug: "winter-bag" });

    expect(seedProducts).toHaveLength(4);
  });

  it("rejects duplicate and empty slugs and invalid prices", () => {
    expect(() =>
      saveProduct(seedProducts, "new", "Everyday mug!", "10"),
    ).toThrow(/already uses/);

    for (const name of ["", "!!!", "日本語", "a".repeat(81)])
      expect(() => saveProduct(seedProducts, "new", name, "10")).toThrow(
        /name/,
      );
    for (const price of ["", "-1", "0", "1.001", "10001", "Infinity", "NaN"])
      expect(() => saveProduct(seedProducts, "new", "Test", price)).toThrow(
        /price/,
      );
  });

  it("keeps cart totals in cents and reconciles edits and deleted products", () => {
    const cart = { mug: 2, tote: 1, deleted: 8 };
    expect(cartTotal(seedProducts, cart)).toBe(6000);
    const edited = saveProduct(seedProducts, "mug", "New mug", "10");
    expect(cartTotal(edited, cart)).toBe(4400);
    expect(
      cartLines(
        edited.filter((product) => product.id !== "mug"),
        cart,
      ),
    ).toHaveLength(1);

    expect(cartTotal([], cart)).toBe(0);
  });
});
