"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toast } from "@/components/ui";

function NoticeToastInner() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const notice = params.get("notice");
  const [visible, setVisible] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    setVisible(notice);
    const next = new URLSearchParams(params.toString());
    next.delete("notice");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, params, pathname, router]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(null), 3200);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return <Toast message={visible} />;
}

export function NoticeToast() {
  return (
    <Suspense fallback={null}>
      <NoticeToastInner />
    </Suspense>
  );
}
