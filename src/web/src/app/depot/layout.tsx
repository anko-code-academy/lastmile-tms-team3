import { auth } from "@/auth";
import { redirect } from "next/navigation";

const DEPOT_ROLES = new Set(["Admin", "OperationsManager", "DepotOperator", "WarehouseOperator"]);

export default async function DepotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DEPOT_ROLES.has(session?.user?.role ?? "")) redirect("/");
  return <>{children}</>;
}
