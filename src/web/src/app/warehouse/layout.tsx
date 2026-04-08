import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function WarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user?.role;
  if (role !== "Admin" && role !== "WarehouseManager") {
    redirect("/");
  }

  return <>{children}</>;
}
