import "server-only";
import { entregarPdfCompleto } from "@/lib/data/entrega";

export async function GET() {
  return entregarPdfCompleto();
}
