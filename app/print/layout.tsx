import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import "./print.css";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-200 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[9.5in]">{children}</div>
    </div>
  );
}
