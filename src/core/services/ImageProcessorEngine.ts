import { logger } from './logger';

/**
 * ImageProcessorEngine - Motor de Otimização de Mídia
 * Converte imagens para JPEG 1:1 de baixa qualidade para economia de storage.
 */
export class ImageProcessorEngine {
  private static readonly TARGET_SIZE = 512; // Tamanho recomendado: 512x512px
  private static readonly QUALITY = 0.6;    // Qualidade JPEG (0.0 a 1.0)

  /**
   * Processa um arquivo de imagem: Redimensiona, Corta 1:1 e comprime.
   */
  static async processForUpload(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Falha ao inicializar contexto de processamento gráfico.'));
            return;
          }

          // Define dimensões 1:1
          canvas.width = this.TARGET_SIZE;
          canvas.height = this.TARGET_SIZE;

          // Lógica de Crop Centralizado (Aspect Ratio 1:1)
          const sourceSize = Math.min(img.width, img.height);
          const sourceX = (img.width - sourceSize) / 2;
          const sourceY = (img.height - sourceSize) / 2;

          // Renderiza a imagem cortada e redimensionada
          ctx.drawImage(
            img, 
            sourceX, sourceY, sourceSize, sourceSize, // Origem (Crop)
            0, 0, this.TARGET_SIZE, this.TARGET_SIZE  // Destino (Resize)
          );

          // Converte para JPEG de baixa qualidade
          canvas.toBlob(
            (blob) => {
              if (blob) {
                logger.debug('system', 'Imagem processada com sucesso', { 
                  originalSize: (file.size / 1024).toFixed(1) + 'kb',
                  newSize: (blob.size / 1024).toFixed(1) + 'kb' 
                });
                resolve(blob);
              } else {
                reject(new Error('Erro na compressão da imagem.'));
              }
            },
            'image/jpeg',
            this.QUALITY
          );
        };
      };

      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Recomendações técnicas de upload
   */
  static getRecommendations() {
    return {
      dimensions: `${this.TARGET_SIZE}x${this.TARGET_SIZE}px`,
      format: 'JPEG (Low Quality)',
      aspectRatio: '1:1 (Quadrado)'
    };
  }
}