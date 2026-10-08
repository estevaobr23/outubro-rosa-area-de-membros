import "server-only";
import { entregarDownloadCartinha } from "@/lib/data/entrega";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return entregarDownloadCartinha(id);
}
