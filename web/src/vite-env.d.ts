/// <reference types="vite/client" />

interface MusicKitInstance {
  authorize(): Promise<string>;
  unauthorize(): Promise<void>;
  isAuthorized: boolean;
}

interface Window {
  MusicKit: {
    configure(config: { developerToken: string; app: { name: string; build: string } }): Promise<void>;
    getInstance(): MusicKitInstance;
  };
}
