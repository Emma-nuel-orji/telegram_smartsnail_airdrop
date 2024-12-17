import { NextRequest, NextResponse } from 'next/server'
import { updatePointsForTelegramId } from "../../../src/utils/db";

export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();

    // Validate input
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: "telegramId is required" }, 
        { status: 400 }
      );
    }

    // Call the function to update points
    const updatedPoints = await updatePointsForTelegramId(telegramId);

    if (updatedPoints !== null) {
      return NextResponse.json({ 
        success: true, 
        points: updatedPoints 
      });
    } else {
      return NextResponse.json(
        { success: false, error: "User not found" }, 
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in /api/claim-welcome:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" }, 
      { status: 500 }
    );
  }
}