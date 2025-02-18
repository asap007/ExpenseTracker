// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET all expenses (existing code - unchanged)
export async function GET(req: NextRequest) {
    // ... (Your existing GET logic)
     try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST create a new expense (modified for Cloudinary)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();

    const amount = formData.get("amount")?.toString();
    const description = formData.get("description")?.toString();
    const date = formData.get("date")?.toString();
    const categoryId = formData.get("categoryId")?.toString();
    const receiptFile = formData.get("receipt") as File | null;

    if (!amount || !description || !date || !categoryId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
      
    let receiptUrl = null;
      
    if (receiptFile) {
        // Convert the file to a buffer
        const buffer = Buffer.from(await receiptFile.arrayBuffer());
        
        // Use a Promise to handle the Cloudinary upload
        receiptUrl = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error); // Reject the promise on error
                    return;
                }
                resolve(result?.secure_url);
            }).end(buffer);
        });
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        categoryId,
        userId: user.id,
        receiptUrl, // Store the Cloudinary URL
      },
      include: { category: true },
    });

    await prisma.log.create({
      data: {
        action: `Created expense: ${description} - $${amount}`,
        userId: user.id,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}