import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const query = "SELECT * FROM places WHERE id = $1";
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Place not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching place:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch place" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, adress } = body;

    const updates: string[] = [];
    const values: any[] = [id];
    let paramCount = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (adress !== undefined) {
      updates.push(`adress = $${paramCount}`);
      values.push(adress);
      paramCount++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE places
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Place not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error updating place:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update place" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const query = "DELETE FROM places WHERE id = $1 RETURNING *";
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Place not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error deleting place:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete place" },
      { status: 500 }
    );
  }
}
