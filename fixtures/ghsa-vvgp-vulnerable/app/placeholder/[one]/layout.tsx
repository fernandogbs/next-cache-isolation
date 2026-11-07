import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ one: "b" }];
}

export default async function OneLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ one: string }>;
}) {
  const { one } = await params;
  return (
    <div>
      <div id="one" data-rendered-at={String(performance.now())}>
        {one}
      </div>
      {children}
    </div>
  );
}
