/** The disposable demo database; `MYSHOP_DATABASE` lets tests use an isolated one. */
export const myShopDatabaseName = (environment = process.env) =>
  environment.MYSHOP_DATABASE || "myshop_demo";
