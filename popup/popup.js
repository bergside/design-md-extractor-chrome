const state = {
  markdown: "",
  filename: "",
  mode: "design",
  busy: false,
  lastResult: null
};

const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const refreshBtn = document.getElementById("refreshBtn");
const downloadBtn = document.getElementById("downloadBtn");
const copyBtn = document.getElementById("copyBtn");
const helpBtn = document.getElementById("helpBtn");
const helpPanel = document.getElementById("helpPanel");
const helpContentEl = document.getElementById("helpContent");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");
const issuesEl = document.getElementById("issues");

refreshBtn.addEventListener("click", () => {
  runExtraction().catch((error) => setStatus(toErrorText(error), true));
});

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;
    if (!mode || mode === state.mode) {
      return;
    }
    state.mode = mode;
    syncModeUi();
    runExtraction().catch((error) => setStatus(toErrorText(error), true));
  });
}

downloadBtn.addEventListener("click", () => {
  downloadCurrent().catch((error) => setStatus(toErrorText(error), true));
});

helpBtn.addEventListener("click", () => {
  const shouldOpen = helpPanel.hidden;
  helpPanel.hidden = !shouldOpen;
  if (shouldOpen) {
    renderGenerationExplanation();
  }
});

closeHelpBtn.addEventListener("click", () => {
  helpPanel.hidden = true;
});

copyBtn.addEventListener("click", async () => {
  try {
    if (!state.markdown) {
      setStatus("Nothing to copy yet.", true);
      return;
    }
    await navigator.clipboard.writeText(state.markdown);
    
    copyBtn.classList.add("copied");
    const copyIcon = copyBtn.querySelector(".icon-copy");
    const successIcon = copyBtn.querySelector(".icon-success");
    if (copyIcon && successIcon) {
      copyIcon.style.display = "none";
      successIcon.style.display = "block";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyIcon.style.display = "block";
        successIcon.style.display = "none";
      }, 2000);
    }
  } catch (error) {
    setStatus(`Copy failed: ${toErrorText(error)}`, true);
  }
});

init().catch((error) => setStatus(`Init failed: ${toErrorText(error)}`, true));

async function init() {
  const data = await chrome.storage.local.get(["outputMode"]);
  state.mode = data.outputMode === "skill" ? "skill" : "design";
  syncModeUi();
  await runExtraction();
}

async function runExtraction() {
  if (state.busy) {
    return;
  }
  setBusy(true);
  clearStatus();
  issuesEl.innerHTML = "";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RUN_EXTRACTION",
      mode: state.mode
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Extraction request failed.");
    }

    state.markdown = response.markdown;
    state.filename = response.filename;
    state.lastResult = response;

    previewEl.value = response.markdown;
    downloadBtn.disabled = false;
    copyBtn.disabled = false;

    renderValidationIssues(response.validation);
    clearStatus();
    if (!helpPanel.hidden) {
      renderGenerationExplanation();
    }
  } finally {
    setBusy(false);
  }
}

async function downloadCurrent() {
  if (!state.markdown || !state.filename) {
    setStatus("Nothing to download yet.", true);
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "DOWNLOAD_MARKDOWN",
    mode: state.mode,
    filename: state.filename,
    markdown: state.markdown
  });

  if (!response || !response.ok) {
    throw new Error(response?.error || "Download failed.");
  }
  clearStatus();
}

function setBusy(isBusy) {
  state.busy = isBusy;
  refreshBtn.disabled = isBusy;
  for (const button of modeButtons) {
    button.disabled = isBusy;
  }
}

function renderValidationIssues(validation) {
  issuesEl.innerHTML = "";
  if (!validation) {
    return;
  }

  const issues = [
    ...(validation.errors || []),
    ...(validation.warnings || [])
  ];

  if (issues.length === 0) {
    return;
  }

  for (const issue of issues) {
    const item = document.createElement("li");
    item.textContent = issue;
    issuesEl.appendChild(item);
  }
}

function setStatus(text, isError = false) {
  const value = String(text || "").trim();
  if (!value) {
    clearStatus();
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = value;
  statusEl.style.color = isError ? "#b91c1c" : "#1f1f1f";
}

function toErrorText(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "Unknown error");
}

function syncModeUi() {
  for (const button of modeButtons) {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
  }
  if (!helpPanel.hidden) {
    renderGenerationExplanation();
  }
}

function renderGenerationExplanation() {
  const modeLabel = state.mode === "skill" ? "SKILL.md" : "DESIGN.md";
  const result = state.lastResult;

  if (!result) {
    helpContentEl.innerHTML = `
      <p>No extraction result is loaded yet.</p>
      <p>Run extraction and open this panel again for a full breakdown.</p>
      <p>
        The format is based on the TypeUI DESIGN.md configuration:
        <a href="https://www.typeui.sh/design-md" target="_blank" rel="noopener noreferrer">https://www.typeui.sh/design-md</a>
      </p>
    `;
    return;
  }

  const normalized = result.normalized || {};
  const siteProfile = normalized.siteProfile || {};
  const checks = result.validation?.checks || [];
  const passedChecks = checks.filter((item) => item.ok).length;

  const summary = {
    sampledElements: normalized.sampledElements ?? "n/a",
    totalElements: normalized.totalElements ?? "n/a",
    typographyTokens: (normalized.typographyScale || []).length,
    colorTokens: (normalized.colorPalette || []).length,
    spacingTokens: (normalized.spacingScale || []).length,
    radiusTokens: (normalized.radiusTokens || []).length,
    shadowTokens: (normalized.shadowTokens || []).length,
    motionTokens: (normalized.motionDurationTokens || []).length + (normalized.motionEasingTokens || []).length
  };

  const componentHints = (normalized.componentHints || [])
    .slice(0, 5)
    .map((item) => `${item.type}: ${item.count}`)
    .join(", ");

  const inferenceEvidence = (siteProfile.evidence || []).slice(0, 5).join("; ");
  const inferenceText = siteProfile.audience || siteProfile.productSurface
    ? `Audience "${escapeHtml(siteProfile.audience || "n/a")}" and surface "${escapeHtml(siteProfile.productSurface || "n/a")}" inferred with ${escapeHtml(siteProfile.confidence || "unknown")} confidence.`
    : "Audience and product surface fallback values were used because evidence confidence was low.";

  helpContentEl.innerHTML = `
    <p><strong>${modeLabel}</strong> is generated automatically through a multi-step pipeline:</p>
    <ol>
      <li><strong>Style extraction.</strong> The extension scans visible page elements and captures computed typography, colors, spacing, radius, shadows, and motion values. Current run: ${escapeHtml(String(summary.sampledElements))} sampled elements from ${escapeHtml(String(summary.totalElements))} total nodes.</li>
      <li><strong>Token normalization.</strong> Raw values are deduplicated and grouped into semantic-like token sets to create reusable foundations. Current token coverage: typography ${escapeHtml(String(summary.typographyTokens))}, color ${escapeHtml(String(summary.colorTokens))}, spacing ${escapeHtml(String(summary.spacingTokens))}, radius ${escapeHtml(String(summary.radiusTokens))}, shadow ${escapeHtml(String(summary.shadowTokens))}, motion ${escapeHtml(String(summary.motionTokens))}.</li>
      <li><strong>Website profiling.</strong> The generator uses URL/path patterns, metadata, headings, navigation labels, CTA text, and structural signals (forms, tables, code blocks, pricing/product markers) to infer brand context. ${escapeHtml(inferenceText)} ${inferenceEvidence ? `Evidence: ${escapeHtml(inferenceEvidence)}.` : ""}</li>
      <li><strong>Blueprint assembly.</strong> The content is assembled into required sections for ${modeLabel}, including mission, brand, style foundations, accessibility, rule sets, workflow, and quality gates, while preserving required state coverage.</li>
      <li><strong>Conformance checks.</strong> The generated file is validated against required headings, frontmatter/managed markers (for SKILL), accessibility target wording, and state references. Current run passed ${escapeHtml(String(passedChecks))}/${escapeHtml(String(checks.length))} checks.</li>
    </ol>
    <p>This generation flow is based on the TypeUI DESIGN.md configuration and structure guidelines:</p>
    <p><a href="https://www.typeui.sh/design-md" target="_blank" rel="noopener noreferrer">https://www.typeui.sh/design-md</a></p>
    <p>${componentHints ? `Detected component density signals: ${escapeHtml(componentHints)}.` : "No strong component density signals were detected for this page."}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.hidden = true;
}
