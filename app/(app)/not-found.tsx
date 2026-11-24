import { StatusScreen } from "@/components/status-screen";

export default function AppNotFound() {
  return (
    <StatusScreen
      code="404"
      title="Halaman tidak ditemukan"
      description="Alamat ini tidak ada, atau datanya sudah tidak ada."
    />
  );
}
