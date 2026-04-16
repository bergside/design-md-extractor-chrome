export function generateSkillMarkdown(context) {
  const { normalized, metadata = {} } = context;
  const siteProfile = normalized.siteProfile || {};
  const systemName = metadata.systemName || inferSystemName(normalized.source?.title);
  const slug = slugify(metadata.scope || metadata.brand || systemName || "extracted");
  const brand = metadata.brand || systemName;
  const extractionUrl = normalized.source?.url || "Unknown URL";
  const audience = metadata.audience || siteProfile.audience || "website visitors and product users";
  const productSurface = metadata.productSurface || siteProfile.productSurface || "web app";

  const mainFontStyle = formatMainFontStyle(normalized.mainFontStyle);
  const typographyScale = joinTokens(normalized.typographyScale, 8);
  const colors = joinTokens(normalized.colorPalette, 10);
  const spacing = joinTokens(normalized.spacingScale, 8);
  const radiusShadowMotion = joinTokenGroups(
    [normalized.radiusTokens, normalized.shadowTokens, normalized.motionDurationTokens],
    8
  );

  return `---
name: design-system-${slug}
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# ${systemName}

## Mission
Deliver implementation-ready design-system guidance for ${brand} that can be applied consistently across ${productSurface} interfaces.

## Brand
- Product/brand: ${brand}
- URL: ${extractionUrl}
- Audience: ${audience}
- Product surface: ${productSurface}

## Style Foundations
- Visual style: structured, accessible, implementation-first
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
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
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

function slugify(value) {
  return String(value || "extracted")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function joinTokens(rows, limit) {
  if (!rows || rows.length === 0) {
    return "manual token definitions required";
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
    return "manual token definitions required";
  }
  return lines.join(" | ");
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
