export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 sm:py-12 lg:max-w-xl lg:justify-center lg:py-16">
      {children}
    </div>
  );
}
