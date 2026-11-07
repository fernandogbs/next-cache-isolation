import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function TwoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ one: string; two: string }>;
}) {
  const { two } = await params;

  if (two !== "foo" && two !== "bar") {
    notFound();
  }

  return (
    <div>
      <div id="two">
        {two}
        <span id="marker">{`NCI_VVGP_${two}`}</span>
      </div>
      {children}
    </div>
  );
}
