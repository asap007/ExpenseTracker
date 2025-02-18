import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const generationConfig: GenerationConfig = {
  stopSequences: undefined, //remove stopSequences  as causing some issues with gemini api.
  maxOutputTokens: 2000,  // Adjust as needed
  temperature: 0.7, // Adjust for creativity (0.0 - 1.0)
  topP: 0.95,         // Adjust for diversity (nucleus sampling)
  topK: 40,           // Adjust for quality (top-k sampling)
  responseMimeType: "application/json", // Explicitly request JSON
};

// Use 'gemini-pro' (without responseMimeType)
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalAmount, timeframe } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's income and expenses
    const income = await prisma.income.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyIncome = income?.amount || 0;

// Improved Prompt (Stronger Emphasis, Example)
    const prompt = `
Create a financial savings plan based on the following:

Monthly Income: $${monthlyIncome}
Total Monthly Expenses: $${totalExpenses}
Savings Goal: $${goalAmount}
Timeframe: ${timeframe} months

Respond with a JSON object and nothing else.  Do NOT include any Markdown, backticks (\`), introductory text, or concluding remarks.  The response should consist of *ONLY* the JSON object.

Here's the REQUIRED JSON structure:

{
  "savingsPlan": "A detailed savings plan (string).",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Example of a VALID response (replace with your plan data):

{
  "savingsPlan": "Save $X per month...",
  "recommendations": ["Reduce spending...", "Increase income...", "Automate transfers..."],
  "tips": ["Track expenses...", "Set goals...", "Review progress..."]
}

I repeat: Respond with *ONLY* the JSON object, and nothing else. No \`\`\`, no "json", no other text.
`;
    // Generate content
    const result = await model.generateContent(prompt);

    if (!result?.response) {
      throw new Error("Invalid AI response: No response received");
    }

    let responseText = result.response.text();

    // Clean up the response: Remove backticks and "json" if present
    responseText = responseText.replace(/```json\s*|\s*```/g, ""); // Remove code blocks
    responseText = responseText.trim();


    try {
      const aiResponse = JSON.parse(responseText);

      // Validate the response structure
      if (
        !aiResponse.savingsPlan ||
        !Array.isArray(aiResponse.recommendations) ||
        !Array.isArray(aiResponse.tips)
      ) {
        throw new Error("Invalid response structure");
      }

      return NextResponse.json(aiResponse);
    } catch (parseError) {
      console.error(
        "Failed to parse AI response:",
        parseError,
        "Original response:",
        responseText
      );

      // Fallback response
      return NextResponse.json(
        {
          savingsPlan:
            "Unable to generate a personalized savings plan at this time.  Please check your input and try again.",
          recommendations: [
            "Review your monthly expenses and identify areas where you can reduce spending.",
            "Set up automatic transfers to a dedicated savings account each payday.",
            "Explore options for increasing your income, such as a side hustle or negotiating a raise.",
          ],
          tips: [
            "Track your spending meticulously to understand where your money is going.",
            "Set realistic and achievable savings goals to stay motivated.",
            "Regularly review your progress and adjust your plan as needed.",
          ],
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to generate savings plan:", error);
    return NextResponse.json(
      { error: "Failed to generate savings plan" },
      { status: 500 }
    );
  }
}