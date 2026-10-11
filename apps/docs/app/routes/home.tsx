import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Link } from "react-router";
import { baseOptions } from "@/lib/layout";

export function meta() {
  return [
    { title: "InProduct documentation" },
    {
      name: "description",
      content: "Small, composable tools that live in your application.",
    },
  ];
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
        <h1 className="text-xl font-bold mb-2">
          Tools that belong in your product.
        </h1>
        <p className="text-fd-muted-foreground mb-4">
          Install InProduct, integrate the library and explore the local MyShop
          example.
        </p>
        <Link
          className="text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5"
          to="/docs"
        >
          Open Docs
        </Link>
      </div>
    </HomeLayout>
  );
}
