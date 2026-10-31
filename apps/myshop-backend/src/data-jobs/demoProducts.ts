/** Synthetic legacy documents. Archived products still carry fields the shop no longer uses. */
export const demoProducts = [
  {
    _id: "everyday-mug",
    name: "Everyday mug",
    status: "active",
    price: 1800,
    internal: { sku: "MUG-1" },
  },
  // Active products are out of scope: this one keeps its legacy fields.
  {
    _id: "linen-napkins",
    name: "Linen napkins",
    status: "active",
    price: 2400,
    legacyPrice: "24.00",
    internal: { sku: "NAP-4", notes: "Reorder in spring" },
  },
  {
    _id: "stoneware-bowl",
    name: "Stoneware bowl",
    status: "archived",
    price: 2200,
    legacyPrice: "22.00",
    internal: { sku: "BWL-2", notes: "Old supplier, discontinued" },
  },
  {
    _id: "cork-coasters",
    name: "Cork coasters",
    status: "archived",
    price: 900,
    legacyPrice: 9,
    internal: { sku: "CRK-6" },
  },
  {
    _id: "brass-tray",
    name: "Brass tray",
    status: "archived",
    price: 4600,
    legacyPrice: null,
  },
];
