import type { ReactNode } from "react";

export async function generateStaticParams() {
  return [{ locale: "pt-BR" }, { locale: "en-US" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
