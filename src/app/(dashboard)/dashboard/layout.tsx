import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Import authOptions
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Use getServerSession with authOptions
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}