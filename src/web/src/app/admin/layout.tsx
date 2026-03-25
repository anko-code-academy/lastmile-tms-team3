import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (
    session?.user?.role !== "Admin" &&
    session?.user?.role !== "OperationsManager"
  )
    redirect("/");
  return <>{children}</>;
}
