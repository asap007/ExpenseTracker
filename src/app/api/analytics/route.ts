import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // Use the shared Prisma instance

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the time range from query params
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (timeRange === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Get basic expense data
    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Calculate totals
    const currentPeriodTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averagePerMonth = currentPeriodTotal / (timeRange === "week" ? 0.25 : timeRange === "month" ? 1 : 12);

    // Generate a complete date range
    const dateRange: { date: string; amount: number }[] = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      dateRange.push({
        date: d.toISOString().split("T")[0],
        amount: 0,
      });
    }

    // Merge expenses into the date range
    expenses.forEach((expense) => {
      const dateKey = expense.date.toISOString().split("T")[0];
      const dateEntry = dateRange.find((item) => item.date === dateKey);
      if (dateEntry) {
        dateEntry.amount += expense.amount;
      }
    });

    const expensesTrend = dateRange;

    // Process category data
    const categoryTotals = expenses.reduce((acc, expense) => {
      const categoryName = expense.category.name;
      acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const expensesByCategory = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));

    // Simple projection based on average daily expense
    const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyExpense = currentPeriodTotal / daysInPeriod;
    const projectedExpense = averageDailyExpense * (timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365);

    return NextResponse.json({
      currentPeriodTotal,
      averagePerMonth,
      projectedExpense,
      expensesTrend,
      expensesByCategory,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}