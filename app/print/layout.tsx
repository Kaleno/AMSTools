import { redirect } from "next/navigation";
import { Copyright } from "@/components/copyright";
import { getCurrentUser } from "@/lib/current-user";
import "./print.css";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-200 p-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[9.5in] flex-1">{children}</div>
      <Copyright className="no-print pt-4 text-center text-xs text-slate-500" />
    </div>
  );
}
