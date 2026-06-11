export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Only set crossOrigin for network URLs — setting it on a data: URI causes
    // some browsers/WebViews to reject the load entirely.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // set canvas size to match the bounding box
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.translate(image.width / 2, image.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // extract the cropped image using given crop coordinates
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(new File([file], "cropped.jpeg", { type: "image/jpeg" }));
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, 'image/jpeg');
  });
}
