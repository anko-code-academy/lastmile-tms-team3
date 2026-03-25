import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session?.user?.role !== "Admin") redirect("/");
  return <UsersClient />;
}
