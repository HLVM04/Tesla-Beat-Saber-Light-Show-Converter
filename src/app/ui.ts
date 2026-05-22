import type { AppElements } from "./dom";
import type { UIState } from "./types";

export function setUIState(elements: AppElements, state: UIState) {
  elements.uploadCard.classList.toggle("hidden", state !== "upload");
  elements.configCard.classList.toggle("hidden", state !== "config");
  elements.progressCard.classList.toggle("hidden", state !== "progress");
  elements.resultsContainer.classList.toggle("hidden", state !== "done");
  elements.tutorialSection.classList.toggle("hidden", state === "progress");
}

export function setupTheme(elements: AppElements, onThemeChanged: () => void) {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "shadcn-dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "shadcn-dark");
    elements.themeToggle.checked = true;
  } else {
    document.documentElement.setAttribute("data-theme", "shadcn");
    elements.themeToggle.checked = false;
  }

  elements.themeToggle.addEventListener("change", (event) => {
    const isDark = (event.target as HTMLInputElement).checked;
    const theme = isDark ? "shadcn-dark" : "shadcn";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    onThemeChanged();
  });
}

export function updateProgress(percent: number, status: string): Promise<void> {
  const progressBarSweep = document.getElementById("progress-bar-sweep");
  const progressStatus = document.getElementById("progress-status");

  if (progressStatus) progressStatus.innerText = status;
  if (progressBarSweep) {
    progressBarSweep.style.width = `${percent}%`;
  }

  return new Promise((resolve) => setTimeout(resolve, 350));
}
