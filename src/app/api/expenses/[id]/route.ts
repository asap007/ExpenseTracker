// PATCH/PUT update an expense
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });
    
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Handle FormData instead of JSON
    const formData = await req.formData();
    
    const amount = formData.get('amount')?.toString();
    const description = formData.get('description')?.toString();
    const date = formData.get('date')?.toString();
    const categoryId = formData.get('categoryId')?.toString();
    const receiptFile = formData.get('receipt') as File | null;
    
    // Build update data
    const updateData: any = {};
    
    if (amount) updateData.amount = parseFloat(amount);
    if (description) updateData.description = description;
    if (date) updateData.date = new Date(date);
    if (categoryId) updateData.categoryId = categoryId;
    
    // Handle file upload if provided
    if (receiptFile && receiptFile.size > 0) {
      // Here you would normally upload the file to a storage service
      // This is a placeholder - you'll need to implement actual file upload logic
      updateData.receiptUrl = `/uploads/${Date.now()}-${receiptFile.name}`;
    }
    
    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: updateData,
      include: { category: true },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        action: `Updated expense: ${updatedExpense.description} - $${updatedExpense.amount}`,
        userId: user.id,
      },
    });
    
    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}