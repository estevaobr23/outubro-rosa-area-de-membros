/** As URLs das imagens e downloads, num lugar só. */
export const urlCartinha = (id: string) => `/api/cartinha/${id}`;
export const urlDownloadCartinha = (id: string) => `/api/download/cartinha/${id}`;
export const urlDownloadPdfCompleto = () => `/api/download/pdf-completo`;
export const urlDownloadFolhaA4 = (lote: number) => `/api/download/folha-a4/${lote}`;
