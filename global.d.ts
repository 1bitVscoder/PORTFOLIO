declare global {
  interface Window {
    __freshLoad?: boolean;
    __welcomeComplete?: boolean;
    __welcomeHandoff?: boolean;
  }
}

export {};
