export default async function ThreePage({
  params,
}: {
  params: Promise<{ one: string; two: string; three: string }>;
}) {
  const { three } = await params;
  return <div id="three">{three}</div>;
}
