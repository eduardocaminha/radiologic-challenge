// Prints chegam como PNG de tela cheia, de 300 a 500 KB. Em WebP e até 1600 px de largura
// (o card em tela retina pede uns 1200), o mesmo print cai para 30 a 60 KB.
const MAX_WIDTH = 1600;
const QUALITY = 0.82;

// Converte no navegador antes do upload. Se o navegador não codifica WebP, ou se a conversão
// não diminui o arquivo, devolve o original.
export async function compressScreenshot(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}
