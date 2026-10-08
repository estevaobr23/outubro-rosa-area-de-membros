import "server-only";
import { NextResponse } from "next/server";
import { possuiCartinhas } from "@/lib/data/biblioteca";
import { gerarFolhaA4, TOTAL_LOTES } from "@/lib/data/folha-a4";

export async function GET(_req: Request, { params }: { params: Promise<{ lote: string }> }) {
  if (!(await possuiCartinhas())) {
    return new NextResponse("Nao encontrado", { status: 404 });
  }

  const { lote } = await params;
  const numero = Number(lote);

  // Só lotes inteiros dentro da faixa real — fora dela é 404, nunca PDF vazio.
  if (!Number.isInteger(numero) || numero < 1 || numero > TOTAL_LOTES) {
    return new NextResponse("Nao encontrado", { status: 404 });
  }

  const pdfBytes = await gerarFolhaA4(numero);
  if (!pdfBytes) {
    return new NextResponse("Nao encontrado", { status: 404 });
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartinhas-folha-${String(numero).padStart(2, "0")}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
