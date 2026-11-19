// Type declarations for dependencies that ship without their own. Only the
// surface the app actually uses is described.

declare module "@paystack/inline-js" {
  interface PaystackTransactionResponse {
    reference: string;
    [key: string]: unknown;
  }

  interface PaystackSetupOptions {
    key?: string;
    email?: string;
    /** In the smallest currency unit (amount * 100). */
    amount: number;
    currency?: string;
    ref?: string;
    label?: string;
    onClose?: () => void;
    callback?: (response: PaystackTransactionResponse) => void;
    [key: string]: unknown;
  }

  interface PaystackHandler {
    openIframe(): void;
  }

  const PaystackPop: {
    setup(options: PaystackSetupOptions): PaystackHandler;
  };

  export default PaystackPop;
}

declare module "react-image-magnify" {
  import type { ComponentType, CSSProperties, ReactEventHandler } from "react";

  interface MagnifySmallImage {
    alt?: string;
    src: string;
    isFluidWidth?: boolean;
    width?: number;
    height?: number;
    onError?: ReactEventHandler<HTMLImageElement>;
  }

  interface MagnifyLargeImage {
    src: string;
    width: number;
    height: number;
    alt?: string;
  }

  export interface ReactImageMagnifyProps {
    smallImage: MagnifySmallImage;
    largeImage: MagnifyLargeImage;
    imageClassName?: string;
    imageStyle?: CSSProperties;
    enlargedImageContainerDimensions?: { width: number | string; height: number | string };
    enlargedImageContainerStyle?: CSSProperties;
    enlargedImagePosition?: "beside" | "over";
    lensStyle?: CSSProperties;
    hintTextMouse?: string;
    [key: string]: unknown;
  }

  const ReactImageMagnify: ComponentType<ReactImageMagnifyProps>;
  export default ReactImageMagnify;
}

// `?url` SVG imports (LiveTrackingModal map markers). Next's own `*.svg`
// declaration doesn't match a path that ends in a query string. The value is
// handed to `useTintedSvg`, which accepts either shape the bundler returns.
declare module "*.svg?url" {
  import type { StaticImageData } from "next/image";

  const content: string | StaticImageData;
  export default content;
}
