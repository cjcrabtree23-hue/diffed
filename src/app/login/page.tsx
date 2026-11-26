import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in · Diffed" };

export default function LoginPage() {
  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
