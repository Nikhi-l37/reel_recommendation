/**
 * Gemini AI Service
 * Connects to the Gemini API (gemini-2.0-flash) for real AI-powered behavioral analysis.
 * Falls back gracefully to the heuristic engine on API failure.
 */

const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Build the system prompt for Gemini
 */
function getSystemPrompt() {
  return `You are an AI-powered Reels Recommendation Agent designed for students. Your job is to analyze a student's Reel interaction history, infer their genuine underlying interests using behavioral signals (not just keywords), and recommend high-quality, educational tech Reels.

YOUR ANALYSIS RULES:

1. INFER DEEP INTEREST — Do NOT match keywords. A student watching a Java meme + coding interview joke + software engineer lifestyle Reel is NOT interested in "Java." They are interested in "software engineering as a career path." Think one level deeper always.

2. CLUSTER SIGNALS — Group Reels by theme, not topic. Ask: what is the student's emotional relationship with this content? (aspiring? curious? frustrated? entertained?)

3. TRAP AVOIDANCE (CRITICAL) — You must NEVER recommend:
   - "10 AI tools that will get you a job" style hype content
   - Viral tech listicles with no depth
   - Clickbait career advice Reels
   - Content a student watches for entertainment that has zero skill-building value
   If a recommendation feels like a YouTube thumbnail bait, reject it and pick something better.

4. DIFFICULTY CALIBRATION — Infer the student's level from what they engage with. Memes + lifestyle = beginner/aspiring. Actual coding Reels + DSA = intermediate. Architecture/system design = advanced.

5. CONFIDENCE SCORING — Be honest. If you only have 1-2 weak signals, say Low confidence. Don't fake certainty.

6. CROSS-REEL CLUSTERING — Look at ALL reels together. Find the underlying pattern across the full watch history. A student who watches gaming setup + GTA gameplay + lag fix reels is interested in "systems/hardware engineering," not just "gaming."

7. ENTERTAINMENT FILTERING — If a student watches non-tech entertainment content (cooking, pets, fitness), do NOT infer tech interest from it. Only infer from tech-adjacent or tech content. The entertainment reels just add noise — filter them out.

8. ENGAGEMENT WEIGHT — Saved + Replayed reels are the strongest signals (active effort). Liked = moderate signal. High watch % = passive interest. Skipped + low watch % = disinterest or rejection.`;
}

/**
 * Build the user prompt with reel data and library context
 */
function buildUserPrompt(profile, reelLibrary) {
  const reelDescriptions = profile.reels.map((r, i) => {
    const signals = [];
    if (r.liked) signals.push("LIKED");
    if (r.saved) signals.push("SAVED");
    if (r.replayed) signals.push("REPLAYED");
    if (r.skipped) signals.push("SKIPPED");
    return `Reel ${i + 1}: "${r.title}"
  Tags: [${r.tags.join(", ")}]
  Watch %: ${r.watchPercentage}%
  Signals: ${signals.length > 0 ? signals.join(", ") : "passive viewing only"}`;
  }).join("\n\n");

  const libraryDescriptions = reelLibrary.map(r =>
    `${r.id}: "${r.title}" | Category: ${r.category} | Difficulty: ${r.difficulty} | ${r.description}`
  ).join("\n");

  return `STUDENT PROFILE: "${profile.name}"
${profile.tagline ? `Context: ${profile.tagline}` : ""}

--- WATCHED REELS ---
${reelDescriptions}

--- AVAILABLE RECOMMENDATION POOL ---
These are the ONLY reels you can recommend from:
${libraryDescriptions}

--- TASK ---
For EACH watched reel, produce a structured analysis. Then produce an overall student profile summary.

IMPORTANT RULES:
- You must recommend from the pool above ONLY (use the exact reel ID like R1, R2, etc.)
- Do NOT recommend the same reel more than twice across all analyses
- Do NOT recommend clickbait or hype content
- Infer DEEP interests — not surface keywords
- Consider ALL reels together to find the underlying pattern

Respond in this EXACT JSON format and nothing else:
{
  "reelAnalyses": [
    {
      "reelIndex": 0,
      "currentReel": "title of the watched reel",
      "interestDetected": "the DEEP underlying interest (not keywords)",
      "why": "behavioral evidence from watch %, liked, saved, replayed, skipped signals",
      "recommendedReelId": "R1",
      "category": "DSA | AI | HLD | Cybersecurity | Cloud | Hardware | Career | Other",
      "whyThisRecommendation": "specific connection between interest and recommended reel",
      "difficulty": "Beginner | Intermediate | Advanced",
      "confidence": "High | Medium | Low",
      "trapDetected": false
    }
  ],
  "profileSummary": {
    "coreCluster": "2-3 sentence synthesis of what this student is REALLY interested in across all reels",
    "skillLevel": "inferred skill level with explanation",
    "blindSpots": "critical knowledge gaps the student should address",
    "priorityReelIds": ["R1", "R2", "R3"]
  }
}`;
}

const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-pro"
];

/**
 * Call the Gemini API with automatic model fallback on 503/429/404 errors
 */
export async function analyzeWithGemini(profile, reelLibrary, apiKey) {
  if (!apiKey) {
    throw new Error("No API key provided");
  }

  const promptText = getSystemPrompt() + "\n\n" + buildUserPrompt(profile, reelLibrary);
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
      responseMimeType: "application/json"
    }
  };

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || response.statusText;
        console.warn(`Model ${model} returned (${response.status}): ${errMsg}. Trying fallback...`);
        lastError = new Error(`Gemini API error (${response.status}): ${errMsg}`);
        // If 503/429/404, try next candidate model
        continue;
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        continue;
      }

      // Parse the JSON response
      let parsed;
      try {
        parsed = JSON.parse(textContent);
      } catch {
        const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          continue;
        }
      }

      if (parsed.reelAnalyses && Array.isArray(parsed.reelAnalyses)) {
        return parsed;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Error connecting to model ${model}:`, err);
    }
  }

  throw lastError || new Error("All Gemini model endpoints failed. Please check your API key and connection.");
}

/**
 * Transform Gemini's raw response into the format the UI expects
 */
export function transformGeminiResponse(geminiResult, profile, reelLibrary) {
  const reelAnalyses = geminiResult.reelAnalyses.map((analysis, idx) => {
    const watchedReel = profile.reels[analysis.reelIndex ?? idx];
    const recId = analysis.recommendedReelId || "R1";
    const recommendedReelObj = reelLibrary.find(r => r.id === recId) || reelLibrary[0];

    return {
      reelId: watchedReel?.id || `reel-${idx}`,
      currentReel: analysis.currentReel || watchedReel?.title || "",
      tags: watchedReel?.tags || [],
      watchPercentage: watchedReel?.watchPercentage || 0,
      liked: !!watchedReel?.liked,
      saved: !!watchedReel?.saved,
      replayed: !!watchedReel?.replayed,
      skipped: !!watchedReel?.skipped,
      interestDetected: analysis.interestDetected || "",
      why: analysis.why || "",
      recommendedReel: `${recommendedReelObj.id} - "${recommendedReelObj.title}"`,
      recommendedReelId: recommendedReelObj.id,
      recommendedReelObj,
      category: analysis.category || recommendedReelObj.category || "Other",
      whyThisRecommendation: analysis.whyThisRecommendation || "",
      difficulty: analysis.difficulty || "Beginner",
      confidence: analysis.confidence || "Medium",
      trapDetected: !!analysis.trapDetected
    };
  });

  // Build profile summary
  const summary = geminiResult.profileSummary || {};
  const priorityReelIds = summary.priorityReelIds || ["R1", "R7", "R8"];
  const priorityReels = priorityReelIds.map(id => {
    const reel = reelLibrary.find(r => r.id === id);
    return reel ? {
      id: reel.id,
      reel: `${reel.id} - "${reel.title}"`,
      reason: `AI-recommended based on inferred interest cluster analysis.`
    } : null;
  }).filter(Boolean);

  return {
    profileId: profile.id,
    profileName: profile.name,
    reelAnalyses,
    summary: {
      coreCluster: summary.coreCluster || "Analysis pending...",
      skillLevel: summary.skillLevel || "Unknown",
      blindSpots: summary.blindSpots || "Unable to determine from available data.",
      priorityReels
    },
    aiPowered: true
  };
}
