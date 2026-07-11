import { lazy, Suspense, useEffect, useState } from "react";

const App = lazy(() => import("../App"));

export default function ClientApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
