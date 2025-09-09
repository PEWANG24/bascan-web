declare module 'quagga' {
  interface QuaggaConfig {
    inputStream: {
      name: string;
      type: string;
      target: HTMLElement;
      constraints?: {
        width: number;
        height: number;
        facingMode?: string;
      };
    };
    decoder: {
      readers: string[];
    };
    locate?: boolean;
    locator?: {
      patchSize: string;
      halfSample: boolean;
    };
  }

  interface QuaggaResult {
    codeResult: {
      code: string;
      format: string;
    };
  }

  interface QuaggaStatic {
    init(config: QuaggaConfig, callback: (err?: Error) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (data: QuaggaResult) => void): void;
  }

  const Quagga: QuaggaStatic;
  export default Quagga;
}
