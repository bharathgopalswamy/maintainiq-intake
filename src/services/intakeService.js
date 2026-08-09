const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function findLocation(text) {
  const patterns = [
    /room\s*[a-z]?\d+/i,
    /building\s*[a-z0-9-]+/i,
    /floor\s*\d+/i,
    /laboratory\s*[a-z0-9-]*/i,
    /lab\s*[a-z0-9-]*/i,
    /gymnasium/i,
    /cafeteria/i,
    /library/i,
    /parking\s*(lot|garage)?\s*[a-z0-9-]*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[0]
        .replace(/\b\w/g, (character) => character.toUpperCase())
        .trim();
    }
  }

  return "";
}

function detectAsset(text) {
  const lowerText = text.toLowerCase();

  const assetRules = [
    {
      keywords: ["air conditioner", "air conditioning", "ac unit", "hvac"],
      category: "HVAC",
      asset: "Air conditioning unit",
      problemType: "Cooling or ventilation failure",
      skill: "HVAC Technician",
    },
    {
      keywords: ["boiler", "furnace", "heater", "heating"],
      category: "HVAC",
      asset: "Heating equipment",
      problemType: "Heating failure",
      skill: "HVAC Technician",
    },
    {
      keywords: ["elevator", "lift"],
      category: "Vertical Transportation",
      asset: "Elevator",
      problemType: "Elevator malfunction",
      skill: "Elevator Technician",
    },
    {
      keywords: ["light", "lighting", "outlet", "electrical", "power"],
      category: "Electrical",
      asset: "Electrical equipment",
      problemType: "Electrical failure",
      skill: "Electrician",
    },
    {
      keywords: ["pipe", "faucet", "toilet", "sink", "water leak", "plumbing"],
      category: "Plumbing",
      asset: "Plumbing fixture",
      problemType: "Leak or plumbing failure",
      skill: "Plumber",
    },
    {
      keywords: ["door", "lock", "window", "gate"],
      category: "Building",
      asset: "Door, lock or building fixture",
      problemType: "Building fixture damage",
      skill: "General Maintenance Technician",
    },
    {
      keywords: ["pump", "motor", "conveyor", "machine"],
      category: "Mechanical",
      asset: "Mechanical equipment",
      problemType: "Mechanical equipment failure",
      skill: "Mechanical Technician",
    },
  ];

  const match = assetRules.find((rule) =>
    rule.keywords.some((keyword) => lowerText.includes(keyword))
  );

  return (
    match || {
      category: "General",
      asset: "",
      problemType: "Inspection required",
      skill: "General Maintenance Technician",
    }
  );
}

function detectSafetyFlags(text) {
  const lowerText = text.toLowerCase();

  const rules = [
    {
      keywords: ["smoke", "fire", "burning smell"],
      message: "Possible fire or smoke hazard",
    },
    {
      keywords: ["sparking", "electric shock", "exposed wire"],
      message: "Possible electrical safety hazard",
    },
    {
      keywords: ["gas smell", "gas leak"],
      message: "Possible gas leak",
    },
    {
      keywords: ["slippery", "wet floor", "flooding"],
      message: "Possible slip or flooding hazard",
    },
    {
      keywords: ["injury", "injured", "unsafe"],
      message: "Potential risk to occupants",
    },
    {
      keywords: ["stuck inside", "trapped"],
      message: "Possible occupant emergency",
    },
  ];

  return rules
    .filter((rule) =>
      rule.keywords.some((keyword) => lowerText.includes(keyword))
    )
    .map((rule) => rule.message);
}

function detectPriority(text, safetyFlags) {
  const lowerText = text.toLowerCase();

  if (safetyFlags.length > 0) {
    return "Urgent Review";
  }

  if (
    ["emergency", "critical", "stopped working", "not working", "failure"].some(
      (keyword) => lowerText.includes(keyword)
    )
  ) {
    return "High";
  }

  if (
    ["leaking", "loud noise", "damaged", "intermittent"].some((keyword) =>
      lowerText.includes(keyword)
    )
  ) {
    return "Medium";
  }

  return "Planner Review";
}

function detectAccessRestriction(text) {
  const timeMatch = text.match(
    /(occupied|available|closed|open|accessible|in use)[^.]*?(\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))/i
  );

  if (timeMatch) {
    return timeMatch[0].trim();
  }

  if (/students|patients|customers|employees|occupants/i.test(text)) {
    return "Confirm occupant access before assigning work";
  }

  return "";
}

function createTitle(asset, problemType) {
  if (asset && problemType) {
    return `${asset}: ${problemType}`;
  }

  return "Maintenance request requiring review";
}

export async function analyzeWorkRequest(description) {
  const response = await fetch("/api/intake/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: description.trim(),
    }),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      result.message || "The work request could not be analyzed."
    );
  }

  return result;
}