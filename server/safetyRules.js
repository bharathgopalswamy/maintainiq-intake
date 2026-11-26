const safetyRules = [
  {
    keywords: ["fire", "smoke", "flames", "burning smell"],
    message: "Possible fire or smoke hazard",
  },
  {
    keywords: ["gas smell", "gas leak", "natural gas"],
    message: "Possible gas leak",
  },
  {
    keywords: [
      "sparking",
      "electric shock",
      "electrocuted",
      "exposed wire",
      "live wire",
    ],
    message: "Possible electrical safety hazard",
  },
  {
    keywords: ["slippery", "wet floor", "flooding", "water on floor"],
    message: "Possible slip or flooding hazard",
  },
  {
    keywords: ["trapped", "stuck inside", "person inside"],
    message: "Possible occupant emergency",
  },
  {
    keywords: ["injured", "injury", "unsafe", "dangerous"],
    message: "Potential risk to occupants",
  },
  {
    keywords: ["chemical spill", "toxic", "hazardous material"],
    message: "Possible hazardous-material exposure",
  },
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word matching: "fire" matches "fire alarm" but not "firewall".
const compiledRules = safetyRules.map((rule) => ({
  message: rule.message,
  patterns: rule.keywords.map(
    (keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i")
  ),
}));

export function detectSafetyFlags(description) {
  return compiledRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(description)))
    .map((rule) => rule.message);
}

export function applySafetyRules(result, originalDescription) {
  const deterministicFlags = detectSafetyFlags(originalDescription);

  const mergedFlags = [
    ...new Set([...result.safetyFlags, ...deterministicFlags]),
  ];

  return {
    ...result,
    safetyFlags: mergedFlags,
    suggestedPriority:
      mergedFlags.length > 0
        ? "Urgent Review"
        : result.suggestedPriority,
  };
}