"use client";

import { useRouter } from "next/navigation";
import { trClass } from "@/components/ui";

export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr className={`${trClass} cursor-pointer`} onClick={() => router.push(href)}>
      {children}
    </tr>
  );
}
