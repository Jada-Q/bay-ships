import BayCanvas from "./components/BayCanvas";
import Overlay from "./components/Overlay";
import BaySwitcher from "./components/BaySwitcher";
import { resolveBay, type UrlParams } from "@/lib/bays";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const params: UrlParams = {
    b: pickString(raw.b),
  };
  const { bay, key } = resolveBay(params);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <BayCanvas bay={bay} bayKey={key} />
      <Overlay bay={bay} bayKey={key} />
      <BaySwitcher active={key} />
    </main>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
