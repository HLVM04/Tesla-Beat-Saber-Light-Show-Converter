export function runSimplifiedValidation(
  durationSeconds: number,
  totalEffects: number,
  hasAudio: boolean,
) {
  const commandsCount = totalEffects * 2;
  const commandLimit = 3500;
  const commandRatio = commandsCount / commandLimit;
  const commandPercentage = Math.round(commandRatio * 100);

  const statusBadge = document.getElementById("validator-status-badge")!;
  const commandRatioEl = document.getElementById("validator-command-ratio")!;
  const commandProgressEl = document.getElementById(
    "validator-command-progress",
  )!;

  const metricDuration = document.getElementById("validator-metric-duration")!;
  const metricAudio = document.getElementById("validator-metric-audio")!;
  const warningsContainer = document.getElementById("validator-warnings")!;

  const checkMemoryIcon = document.getElementById(
    "validator-check-memory-icon",
  )!;
  const checkDurationIcon = document.getElementById(
    "validator-check-duration-icon",
  )!;
  const checkAudioIcon = document.getElementById("validator-check-audio-icon")!;
  const headerIconContainer = document.getElementById(
    "validator-header-icon-container",
  )!;

  const warnings: string[] = [];
  let isFailed = false;

  commandRatioEl.textContent = `${commandsCount.toLocaleString()} / ${commandLimit.toLocaleString()}`;
  commandProgressEl.style.width = `${Math.min(commandPercentage, 100)}%`;
  commandProgressEl.className =
    "h-full rounded-full transition-all duration-500";

  if (commandsCount > commandLimit) {
    commandProgressEl.classList.add("bg-red-400", "dark:bg-red-500/60");
    commandRatioEl.className =
      "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    checkMemoryIcon.textContent = "✗";
    checkMemoryIcon.className =
      "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    isFailed = true;
    warnings.push(
      `<strong>Memory limit exceeded:</strong> Sequence contains <strong>${commandsCount.toLocaleString()}</strong> commands, which exceeds the Tesla hardware memory limit of 3,500. The show will fail to load on the vehicle. Please trim the light show.`,
    );
  } else {
    commandProgressEl.classList.add("bg-black");
    commandRatioEl.className =
      "font-mono text-[10px] text-muted-foreground font-semibold";
    checkMemoryIcon.textContent = "✓";
    checkMemoryIcon.className = "text-success text-xs font-mono font-black";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const formattedDuration = `${minutes}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
  metricDuration.textContent = formattedDuration;

  if (durationSeconds > 14400) {
    checkDurationIcon.textContent = "✗";
    checkDurationIcon.className =
      "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    metricDuration.className =
      "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    isFailed = true;
    warnings.push(
      `<strong>Show too long:</strong> Show duration (<strong>${formattedDuration}</strong>) exceeds the 4-hour playback limit supported by Tesla vehicles.`,
    );
  } else {
    checkDurationIcon.textContent = "✓";
    checkDurationIcon.className = "text-success text-xs font-mono font-black";
    metricDuration.className =
      "font-mono text-[10px] text-base-content font-medium";
  }

  if (hasAudio) {
    metricAudio.textContent = "WAV OK";
    checkAudioIcon.textContent = "✓";
    checkAudioIcon.className = "text-success text-xs font-mono font-black";
    metricAudio.className =
      "font-mono text-[10px] text-base-content font-medium";
  } else {
    metricAudio.textContent = "Missing";
    checkAudioIcon.textContent = "✗";
    checkAudioIcon.className =
      "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    metricAudio.className =
      "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    isFailed = true;
    warnings.push(
      `<strong>Audio track missing:</strong> No WAV audio was generated. Make sure your Beat Saber map contains an .ogg or .egg audio track so it can be transcoded.`,
    );
  }

  if (isFailed) {
    statusBadge.textContent = "Failed";
    statusBadge.className =
      "badge badge-sm font-bold gap-1 text-[9px] px-2.5 py-0.5 uppercase rounded-full tracking-wider border select-none bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/5 dark:text-red-400/90 dark:border-red-500/10 transition-all-300";

    headerIconContainer.className =
      "flex items-center justify-center text-red-500/90 dark:text-red-400/90 shrink-0 transition-all-300";
    headerIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
  } else {
    statusBadge.textContent = "Passed";
    statusBadge.className =
      "badge badge-sm font-bold gap-1 text-[9px] px-2.5 py-0.5 uppercase rounded-full tracking-wider border-0 select-none bg-success/10 text-success transition-all-300";

    headerIconContainer.className =
      "flex items-center justify-center text-green-500 dark:text-green-400 shrink-0 transition-all-300";
    headerIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
  }

  if (warnings.length > 0) {
    warningsContainer.classList.remove("hidden");
    warningsContainer.className =
      "text-xs space-y-1.5 p-3 rounded-2xl bg-warning/5 border border-warning/15 text-warning font-medium";

    warningsContainer.innerHTML = warnings
      .map(
        (warning) => `
        <div class="flex items-start gap-1.5 shrink-0 leading-relaxed font-medium">
          <span class="text-xs mt-0.5 select-none">⚠️</span>
          <span>${warning}</span>
        </div>`,
      )
      .join("");
  } else {
    warningsContainer.classList.add("hidden");
    warningsContainer.innerHTML = "";
  }
}
