import { useTheme } from "../components/theme-provider";

export function usePanelBgColor() {
  const { theme } = useTheme();
  // You can adjust these colors as needed
  return theme === "light" ? "#fff" : "hsl(240, 6%, 10%)";
}
