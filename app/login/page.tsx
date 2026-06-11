import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16 bg-cream">
      <LoginForm error={error ?? null} />
    </div>
  );
}
