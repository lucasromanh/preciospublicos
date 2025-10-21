// Servicio para escaneo de código de barras (wrapper de @zxing/browser)
import { BrowserMultiFormatReader } from "@zxing/browser";

export async function scanBarcode(video: HTMLVideoElement, onResult: (code: string) => void) {
  const reader = new BrowserMultiFormatReader();
  const devices = await BrowserMultiFormatReader.listVideoInputDevices();
  if (devices.length === 0) throw new Error("No se detectó cámara");
  await reader.decodeFromVideoDevice(devices[0].deviceId, video, (result, err) => {
    if (result) onResult(result.getText());
  });
}
