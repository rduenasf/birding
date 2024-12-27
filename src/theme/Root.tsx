import React from "react";
import { AudioProvider } from "../AudioContext";

// Default implementation, that you can customize
export default function Root({ children }) {
  return <AudioProvider>{children}</AudioProvider>;
}
