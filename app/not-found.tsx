import { StandaloneStatus } from "@/components/status-screen";

export default function NotFound() {
  return (
    <StandaloneStatus
      code="404"
      title="Halaman tidak ditemukan"
      description="Alamat ini tidak ada, atau datanya sudah tidak ada."
    />
  );
}
