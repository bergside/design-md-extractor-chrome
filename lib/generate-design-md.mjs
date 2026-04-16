export function generateDesignMarkdown(context) {
  const { normalized, metadata = {} } = context;
  const siteProfile = normalized.siteProfile || {};
  const systemName = metadata.systemName || inferSystemName(normalized.source?.title);
  const brand = metadata.brand || systemName;
  const extractionUrl = normalized.source?.url || "Unknown URL";
  const audience = metadata.audience || siteProfile.audience || "website visitors and product users";
  const productSurface = metadata.productSurface || siteProfile.productSurface || "web app";

  const visualStyle = inferVisualStyle(normalized);
  const mainFontStyle = formatMainFontStyle(normalized.mainFontStyle);
  const typographyScale = joinTokens(normalized.typographyScale, 8);
  const colors = joinTokens(normalized.colorPalette, 10);
  const spacing = joinTokens(normalized.spacingScale, 8);
  const radiusShadowMotion = joinTokenGroups(
    [normalized.radiusTokens, normalized.shadowTokens, normalized.motionDurationTokens],
    8
  );
  const componentNotes = normalized.componentHints
    .map((item) => `${item.type} (${item.count})`)
    .join(", ");
  const diagnosticsNote = normalized.diagnostics.length
    ? `\n- Extraction diagnostics: ${normalized.diagnostics.join(" ")}`
    : "";

  return `# ${systemName}

## Mission
Create implementation-ready, token-driven UI guidance for ${brand} that is optimized for consistency, accessibility, and fast delivery across ${productSurface}.

## Brand
- Product/brand: ${brand}
- URL: ${extractionUrl}
- Audience: ${audience}
- Product surface: ${productSurface}

## Style Foundations
- Visual style: ${visualStyle}
- Main font style: ${mainFontStyle}
- Typography scale: ${typographyScale}
- Color palette: ${colors}
- Spacing scale: ${spacing}
- Radius/shadow/motion tokens: ${radiusShadowMotion}

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: ${componentNotes || "not enough evidence from extraction"}.
${diagnosticsNote}

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
`;
}

function inferSystemName(title) {
  if (!title) {
    return "Extracted Design System";
  }
  const clean = title
    .replace(/\s*\|\s*.*/g, "")
    .replace(/\s*-\s*.*/g, "")
    .trim();
  return clean || "Extracted Design System";
}

function inferVisualStyle(normalized) {
  const colorCount = normalized.colorPalette.length;
  const spacingCount = normalized.spacingScale.length;
  if (colorCount >= 8 && spacingCount >= 6) {
    return "structured, tokenized, content-first";
  }
  if (colorCount >= 5) {
    return "clean, functional, implementation-oriented";
  }
  return "minimal, utility-first, accessibility-prioritized";
}

function formatMainFontStyle(mainFontStyle) {
  if (!mainFontStyle || !mainFontStyle.familyStack) {
    return "No reliable primary font family detected from computed styles.";
  }

  const family = `\`font.family.primary=${mainFontStyle.primaryFamily || mainFontStyle.familyStack}\``;
  const stack = mainFontStyle.familyStack ? `\`font.family.stack=${mainFontStyle.familyStack}\`` : "";
  const size = mainFontStyle.size ? `\`font.size.base=${mainFontStyle.size}\`` : "";
  const weight = mainFontStyle.weight ? `\`font.weight.base=${mainFontStyle.weight}\`` : "";
  const lineHeight = mainFontStyle.lineHeight ? `\`font.lineHeight.base=${mainFontStyle.lineHeight}\`` : "";

  return [family, stack, size, weight, lineHeight].filter(Boolean).join(", ");
}

function joinTokens(rows, limit) {
  if (!rows || rows.length === 0) {
    return "No reliable extraction yet; teams should define explicit semantic tokens manually.";
  }
  return rows
    .slice(0, limit)
    .map((row) => `\`${row.token}=${row.value}\``)
    .join(", ");
}

function joinTokenGroups(groups, limitPerGroup) {
  const lines = groups
    .filter((rows) => rows && rows.length > 0)
    .map((rows) => rows.slice(0, limitPerGroup).map((row) => `\`${row.token}=${row.value}\``).join(", "));
  if (lines.length === 0) {
    return "No reliable extraction yet; motion and shape tokens should be defined manually.";
  }
  return lines.join(" | ");
}
