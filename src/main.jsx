import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TimeFriendsApp from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TimeFriendsApp />
  </StrictMode>
);
