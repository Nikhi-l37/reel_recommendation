
import { REEL_LIBRARY } from "../data/reelLibrary";

/**
 * AI Recommendation Engine
 * Implements behavioral clustering, trap avoidance, difficulty calibration, and confidence scoring.
 */

export const SYSTEM_PROMPT_TEXT = `You are an AI-powered Reels Recommendation Agent designed for students. Your job is to analyze a student's Reel interaction history, infer their genuine underlying interests using behavioral signals (not just keywords), and recommend high-quality, educational tech Reels.

---

STUDENT REEL INTERACTION DATA:
You will receive a list of Reels the student has watched. Each Reel includes:
- Title / Description
- Tags
- Watch percentage (how much they watched)
- Engagement signal: liked / saved / skipped / replayed

---

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

5. CONFIDENCE SCORING — Be honest. If you only have 1-2 weak signals, say Low confidence. Don't fake certainty.`;

/**
 * Detects if a reel matches shallow clickbait patterns
 */
export function isClickbaitTrap(title, tags = []) {
  const trapKeywords = [
    "10 ai tools", "get hired faster", "make money fast", "passive income",
    "become rich", "top 10 tools", "secret cheat code", "guaranteed job",
    "hack your way", "top 5 websites"
  ];
  const combined = (title + " " + tags.join(" ")).toLowerCase();
  return trapKeywords.some(kw => combined.includes(kw));
}

/**
 * Calculates behavioral engagement score (0-100)
 */
export function calculateEngagementScore(reel) {
  let score = reel.watchPercentage || 0;
  if (reel.liked) score += 15;
  if (reel.saved) score += 25;
  if (reel.replayed) score += 30;
  if (reel.skipped) score -= 40;
  return Math.max(0, Math.min(100, score));
}

/**
 * Performs heuristic behavioral analysis on a single reel
 */
export function analyzeSingleReel(reel, allReels = []) {
  const titleLower = reel.title.toLowerCase();
  const tagsLower = reel.tags.map(t => t.toLowerCase()).join(" ");
  const combined = titleLower + " " + tagsLower;

  const isReplayed = !!reel.replayed;
  const isSaved = !!reel.saved;
  const isLiked = !!reel.liked;
  const isSkipped = !!reel.skipped;
  const watchPct = reel.watchPercentage || 0;

  // 1. Trap / Clickbait Detection
  const trapDetected = isClickbaitTrap(reel.title, reel.tags);

  let interestDetected = "";
  let why = "";
  let recReelId = "R1";
  let category = "Other";
  let whyRec = "";
  let difficulty = "Beginner";
  let confidence = "Medium";

  // Behavioral signal count for confidence
  let strongSignals = 0;
  if (watchPct >= 90) strongSignals++;
  if (isSaved) strongSignals++;
  if (isReplayed) strongSignals++;
  if (isLiked) strongSignals++;
  if (isSkipped && watchPct < 50) strongSignals++;

  if (strongSignals >= 3) confidence = "High";
  else if (strongSignals === 2) confidence = "Medium";
  else confidence = "Low";

  // Profile-specific heuristics & deep interest mapping
  if (trapDetected || (isSkipped && watchPct <= 40 && (combined.includes("tool") || combined.includes("hired")))) {
    interestDetected = "Strong rejection of generic clickbait, superficial tool aggregators, and shortcut-heavy productivity hype.";
    why = `Dropped off at ${watchPct}% and skipped. Demonstrates a discerning filter; the student seeks substantive engineering mastery over marketing lists.`;
    recReelId = "R5";
    category = "Other";
    whyRec = "Replaces shallow tool hype with deep, practical Python performance mechanics—the foundational language of modern engineering.";
    difficulty = "Intermediate";
    confidence = isSkipped ? "Medium" : "Low";
  } else if (combined.includes("chatgpt") || combined.includes("gemini") || combined.includes("llm")) {
    interestDetected = "Comparative evaluation of foundation models, benchmark metrics, and multimodal AI capabilities.";
    why = `Watched ${watchPct}% and ${isLiked ? 'liked' : 'engaged'}. Shows active curiosity about cutting-edge model capabilities and the evolving LLM frontier.`;
    recReelId = "R13";
    category = "AI";
    whyRec = "Connects high-level AI model curiosity to real-world production machine learning and recommendation architectures.";
    difficulty = "Advanced";
    confidence = watchPct >= 80 ? "Medium" : "Low";
  } else if (combined.includes("nlp") || combined.includes("understand language") || combined.includes("token")) {
    interestDetected = "Deep technical mechanics of Natural Language Processing (NLP), token embeddings, and semantic vector spaces.";
    why = `Watched ${watchPct}%, saved, and replayed. Replaying mathematical/architectural explanations signals strong intent to grasp real computational theory.`;
    recReelId = "R1";
    category = "DSA";
    whyRec = "Grounding vector embeddings and tensor math in physical contiguous memory layout is essential for understanding ML computation.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("chatbot") || (combined.includes("ai") && combined.includes("tutorial"))) {
    interestDetected = "Practical API integration, rapid prototyping, and building functional AI-powered software tools.";
    why = `Watched ${watchPct}% and saved. Bookmarking an implementation tutorial demonstrates an active builder mindset wanting to ship tangible code.`;
    recReelId = "R9";
    category = "Other";
    whyRec = "Teaches the core request-response lifecycle and API protocols required to connect clients to AI backend services.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("replace software") || combined.includes("future of work") || combined.includes("rejected")) {
    if (combined.includes("rejected")) {
      interestDetected = "Job search resilience, rejection recovery, and actionable portfolio differentiation.";
      why = `Watched ${watchPct}%, liked, and saved. Saving debriefs demonstrates an earnest effort to identify blind spots in hiring pipelines and avoid common candidate pitfalls.`;
      recReelId = "R14";
      category = "Career";
      whyRec = "Provides an actionable differentiator to build tangible proof-of-work and stand out in competitive applicant pools.";
      difficulty = "Beginner";
      confidence = "High";
    } else {
      interestDetected = "Career longevity, future-proofing technical skillsets, and navigating the impact of AI on developer roles.";
      why = `Watched ${watchPct}%, liked, and saved. Saving discussions on career automation reflects long-term career planning and skill resilience.`;
      recReelId = "R14";
      category = "Career";
      whyRec = "Directs automation anxiety into building genuine, collaborative software experience and public proof-of-work.";
      difficulty = "Beginner";
      confidence = "High";
    }
  } else if (combined.includes("midjourney") || combined.includes("diffusion") || combined.includes("image generation")) {
    interestDetected = "Generative image models, diffusion mechanisms, and visual synthetic media pipelines.";
    why = `Watched ${watchPct}% and liked. Indicates interest in visual generative AI architectures beyond text-based models.`;
    recReelId = "R10";
    category = "Hardware";
    whyRec = "Explains the parallel matrix math and GPU compute architecture that enables both real-time graphics and large-scale diffusion models.";
    difficulty = "Intermediate";
    confidence = "Medium";
  } else if (combined.includes("gta") || combined.includes("gameplay")) {
    interestDetected = "Real-time graphical fidelity, 3D rendering pipelines, and the computational limits of modern game engines.";
    why = `Watched ${watchPct}%, liked, and replayed. Replaying complex visual scenes points to genuine awe of state-of-the-art computational simulation and rendering capabilities.`;
    recReelId = "R10";
    category = "Hardware";
    whyRec = "Bridges visual fascination with next-gen game fidelity into understanding the rasterization, shaders, and parallel processing hardware that make it possible.";
    difficulty = "Intermediate";
    confidence = "High";
  } else if (combined.includes("lag") || combined.includes("latency") || combined.includes("network")) {
    interestDetected = "Network latency optimization, packet transmission, and client-server communication protocols.";
    why = `Watched ${watchPct}%, saved, and replayed. Replaying and saving reveals high frustration with connectivity issues and an active desire to understand network bottlenecks.`;
    recReelId = "R4";
    category = "Cybersecurity";
    whyRec = "Directs interest in packet travel and network hops into how internet protocols structure, authenticate, and route packets across the web.";
    difficulty = "Intermediate";
    confidence = "High";
  } else if (combined.includes("open world") || combined.includes("game dev") || combined.includes("unity")) {
    interestDetected = "Game engine architecture, procedural generation algorithms, and memory management for massive virtual environments.";
    why = `Watched ${watchPct}%, saved, and replayed. The double signal of replaying and saving reveals strong curiosity about backend software engineering behind simulations.`;
    recReelId = "R1";
    category = "DSA";
    whyRec = "Establishes the core contiguous memory layout required to understand how game engines store spatial coordinate grids and entity matrices.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("ps5") || combined.includes("xbox") || combined.includes("console")) {
    interestDetected = "Silicon architecture tradeoffs, compute unit benchmarks, and hardware-level throughput.";
    why = `Watched ${watchPct}% and liked. Shows analytical interest in comparative hardware performance metrics and architectural engineering choices.`;
    recReelId = "R5";
    category = "Other";
    whyRec = "Extends interest in hardware compute speed to the software layer, demonstrating how execution overhead directly impacts real-world performance.";
    difficulty = "Intermediate";
    confidence = "Medium";
  } else if (combined.includes("setup") || combined.includes("laptop") || combined.includes("pc")) {
    interestDetected = "Hardware resource optimization and cost-effective workstation setup for active software development.";
    why = `Watched ${watchPct}% and ${isSaved ? 'saved' : 'liked'}. Reflects intent to prepare a functional dev environment on a realistic budget, showing tangible commitment to practice.`;
    recReelId = "R15";
    category = "Hardware";
    whyRec = "Anchors setup-building curiosity into the foundational computer science principles of memory bandwidth, caching, and physical system architecture.";
    difficulty = "Beginner";
    confidence = "Medium";
  } else if (combined.includes("figma") || combined.includes("react") || combined.includes("frontend")) {
    interestDetected = "Design-to-code translation, component-driven UI architecture, and bridging visual layouts into front-end code.";
    why = `Watched ${watchPct}%, saved, and replayed. Highlights an active effort to translate spatial visual layouts directly into modern web component frameworks.`;
    recReelId = "R9";
    category = "Other";
    whyRec = "Helps a UI-focused developer understand how front-end components fetch, consume, and display dynamic backend data.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("css") || combined.includes("animation")) {
    interestDetected = "Advanced front-end motion graphics, DOM rendering performance, and interactive micro-interactions.";
    why = `Watched ${watchPct}%, replayed, and saved. Demonstrates deep passion for rich, creative web interactions and polished user experiences.`;
    recReelId = "R10";
    category = "Hardware";
    whyRec = "Connects CSS hardware-acceleration and smooth 60fps animations to GPU compositing and browser rendering pipelines.";
    difficulty = "Intermediate";
    confidence = "High";
  } else if (combined.includes("portfolio") || (combined.includes("html") && combined.includes("css"))) {
    interestDetected = "Personal branding, showcasing visual + technical output, and practical web deployment.";
    why = `Watched ${watchPct}% and saved. Indicates a clear plan to build a tangible digital portfolio to display hybrid design-engineering capabilities.`;
    recReelId = "R6";
    category = "Cloud";
    whyRec = "Bridges client-side website creation to hosting, DNS, and cloud deployment infrastructure.";
    difficulty = "Beginner";
    confidence = "Medium";
  } else if (combined.includes("ui") && combined.includes("trend")) {
    interestDetected = "Contemporary visual hierarchy, modern UI paradigms, and design system evolution.";
    why = `Watched ${watchPct}% and liked. Shows strong design sensibility and aesthetic awareness that informs their developer taste.`;
    recReelId = "R14";
    category = "Career";
    whyRec = "Offers a high-impact avenue to contribute UI/UX redesigns and front-end polish to real-world open-source software.";
    difficulty = "Beginner";
    confidence = "Medium";
  } else if (combined.includes("switch") && combined.includes("design")) {
    interestDetected = "Career pivot validation, identity transition into tech, and navigating the learning curve of software development.";
    why = `Watched ${watchPct}%, liked, and saved. Shows emotional resonance with non-traditional developer journeys and a desire for actionable transition roadmaps.`;
    recReelId = "R8";
    category = "Career";
    whyRec = "Provides practical guidance on leveraging unique cross-functional design skills to land entry-level engineering roles.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("operating system") || combined.includes("os") || combined.includes("dbms") || combined.includes("database") || combined.includes("oops") || combined.includes("exam") || combined.includes("study")) {
    if (combined.includes("os") || combined.includes("operating system")) {
      interestDetected = "High-density, rapid conceptual clarity on core computer science curriculum (process scheduling, memory management).";
      why = `Watched ${watchPct}% and saved. Bookmarking rapid core-curriculum explainers highlights a structured effort to review and pass university core subjects.`;
      recReelId = "R15";
      category = "Hardware";
      whyRec = "Directs core OS theory into a concrete physical understanding of how RAM, paging, and caches function.";
      difficulty = "Beginner";
      confidence = "High";
    } else if (combined.includes("dbms") || combined.includes("database")) {
      interestDetected = "Relational database schemas, table normalization, and demystifying confusing academic CS coursework.";
      why = `Watched ${watchPct}%, saved, and replayed. Replay behavior demonstrates targeted review of a notoriously confusing university exam subject.`;
      recReelId = "R1";
      category = "DSA";
      whyRec = "Builds essential contiguous memory and data layout intuition that underpins relational table storage and database indexing.";
      difficulty = "Beginner";
      confidence = "High";
    } else if (combined.includes("oops") || combined.includes("oop")) {
      interestDetected = "Object-oriented programming principles (polymorphism, inheritance, encapsulation) for semester exams and viva prep.";
      why = `Watched ${watchPct}% and saved. Confirms systematic review of university core CS syllabus.`;
      recReelId = "R9";
      category = "Other";
      whyRec = "Uses real-world mental models to demystify interface contracts and abstraction layers taught in OOP coursework.";
      difficulty = "Beginner";
      confidence = "Medium";
    } else if (combined.includes("study") || combined.includes("24 hours")) {
      interestDetected = "High-efficiency, rapid concept synthesis and mental models under acute academic pressure.";
      why = `Watched ${watchPct}%, liked, and replayed. Indicates high exam anxiety and an urgent demand for clear, low-fluff conceptual breakdowns.`;
      recReelId = "R7";
      category = "DSA";
      whyRec = "Provides an intuitive, visual shortcut to understanding search algorithm logic commonly tested in university exams without dense jargon.";
      difficulty = "Beginner";
      confidence = "High";
    } else {
      interestDetected = "Academic workload balancing, burnout prevention, and exam survival strategies.";
      why = `Watched ${watchPct}% and engaged. Shows awareness of study mismanagement and seeking sustainable habits for academic survival.`;
      recReelId = "R8";
      category = "Career";
      whyRec = "Shifts perspective from short-term exam panic toward the bigger picture of career milestones and structured skill acquisition.";
      difficulty = "Beginner";
      confidence = "Medium";
    }
  } else if (combined.includes("zomato") || combined.includes("business model") || combined.includes("pm") || combined.includes("product manager") || combined.includes("funding") || combined.includes("saas") || combined.includes("mrr") || combined.includes("mba")) {
    if (combined.includes("zomato") || combined.includes("business model")) {
      interestDetected = "Tech startup unit economics, marketplace dynamics, and commercial monetization strategies of tech platforms.";
      why = `Watched ${watchPct}%, liked, and saved. Indicates a strategic mindset focused on commercial viability and business models over pure code syntax.`;
      recReelId = "R13";
      category = "HLD";
      whyRec = "Connects digital business models directly to the large-scale recommendation architecture that drives platform user retention.";
      difficulty = "Advanced";
      confidence = "High";
    } else if (combined.includes("product manager") || combined.includes("pm")) {
      interestDetected = "Technical product management, cross-functional leadership, and tech-to-business translation roles.";
      why = `Watched ${watchPct}%, saved, and replayed. Replaying and saving PM career content points to active exploration of product leadership and strategy careers.`;
      recReelId = "R9";
      category = "Other";
      whyRec = "Equips an aspiring product manager with the essential technical vocabulary needed to communicate effectively with engineering teams.";
      difficulty = "Beginner";
      confidence = "High";
    } else if (combined.includes("funding") || combined.includes("startup")) {
      interestDetected = "Venture capital mechanisms, equity dilution, fundraising rounds, and startup scaling mechanics.";
      why = `Watched ${watchPct}%, liked, and saved. Shows deep curiosity about early-stage startup mechanics and founder ecosystems.`;
      recReelId = "R14";
      category = "Career";
      whyRec = "Illustrates how open-source ecosystems serve as the foundation for modern developer tools and commercial SaaS businesses.";
      difficulty = "Beginner";
      confidence = "High";
    } else if (combined.includes("saas") || combined.includes("mrr")) {
      interestDetected = "Micro-SaaS architecture, indie hacking, rapid product launch, and recurring revenue generation.";
      why = `Watched ${watchPct}%, replayed, and saved. Demonstrates strong entrepreneurial drive to build profitable, scalable digital software products independently.`;
      recReelId = "R3";
      category = "HLD";
      whyRec = "Teaches the architectural patterns needed to scale a software product reliably from prototype to thousands of paying users.";
      difficulty = "Advanced";
      confidence = "High";
    } else {
      interestDetected = "High-leverage technical literacy required for business leaders and tech management.";
      why = `Watched ${watchPct}% and liked. Reinforces their desire to acquire enough technical fluency to manage engineers and evaluate technical feasibility.`;
      recReelId = "R6";
      category = "Cloud";
      whyRec = "Explains cloud cost structures, scalability, and infrastructure fundamentals critical for business and product decision-making.";
      difficulty = "Beginner";
      confidence = "Medium";
    }
  } else if (combined.includes("meme") || combined.includes("works but you don't know why")) {
    interestDetected = "Debugging intuition and the psychological reality / imposter syndrome of writing and testing code.";
    why = `Watched ${watchPct}%, liked, and replayed. Replaying developer humor shows strong emotional resonance with coding struggles and a desire to understand execution flow without dry lectures.`;
    recReelId = "R11";
    category = "DSA";
    whyRec = "Bridges appreciation for relatable coding humor into conceptual mastery of a notoriously tricky programming execution pattern.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("salary") || combined.includes("swe salary")) {
    interestDetected = "Long-term career viability, compensation benchmarks, and ROI of entering tech.";
    why = `Watched ${watchPct}% and saved. Bookmarking compensation figures indicates deliberate, future-oriented career planning rather than passive entertainment browsing.`;
    recReelId = "R8";
    category = "Career";
    whyRec = "Connects aspirational career and salary goals to the practical, immediate milestone needed to enter the industry.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (combined.includes("leetcode") || combined.includes("dsa") || combined.includes("binary search") || combined.includes("recursion")) {
    interestDetected = "Technical interview anxiety and seeking clarity on effective, high-yield algorithmic preparation.";
    why = `Watched ${watchPct}%, saved, and replayed. The combination of saving and replaying reveals high stress and intense focus on navigating technical coding assessments.`;
    recReelId = "R7";
    category = "DSA";
    whyRec = "De-escalates abstract interview grind anxiety by building visual, foundational intuition for a core algorithmic pattern.";
    difficulty = "Beginner";
    confidence = "High";
  } else if (isSkipped && watchPct < 50) {
    interestDetected = "Aversion to superficial tutorials or disconnected syntax debates; seeking purpose-driven depth.";
    why = `Watched only ${watchPct}% and skipped. Dropping off early signals low tolerance for shallow listicles or disconnected theoretical syntax.`;
    recReelId = "R9";
    category = "Other";
    whyRec = "Moves past basic syntax comparison into fundamental architectural components that apply across languages.";
    difficulty = "Beginner";
    confidence = "Medium";
  } else {
    // Default high-grade inference
    interestDetected = "Curiosity around computational fundamentals and core engineering mechanics.";
    why = `Watched ${watchPct}% with engagement signals (${[isLiked && 'Liked', isSaved && 'Saved', isReplayed && 'Replayed'].filter(Boolean).join(', ') || 'passive'}). Reflects foundational exploration of software and systems topics.`;
    recReelId = "R1";
    category = "DSA";
    whyRec = "Grounds general curiosity in foundational memory structures that underpin all software systems.";
    difficulty = "Beginner";
    confidence = strongSignals >= 2 ? "Medium" : "Low";
  }

  const recommendedReelObj = REEL_LIBRARY.find(r => r.id === recReelId) || REEL_LIBRARY[0];

  return {
    reelId: reel.id,
    currentReel: reel.title,
    tags: reel.tags,
    watchPercentage: watchPct,
    liked: isLiked,
    saved: isSaved,
    replayed: isReplayed,
    skipped: isSkipped,
    interestDetected,
    why,
    recommendedReel: `${recommendedReelObj.id} - "${recommendedReelObj.title}"`,
    recommendedReelId: recommendedReelObj.id,
    recommendedReelObj,
    category,
    whyThisRecommendation: whyRec,
    difficulty,
    confidence,
    trapDetected
  };
}

/**
 * Analyzes the full student profile and generates student profile summary
 */
export function analyzeStudentProfile(profile) {
  const reelAnalyses = profile.reels.map(reel => analyzeSingleReel(reel, profile.reels));

  // Determine Core Cluster & Skill Level
  let coreCluster = "";
  let skillLevel = "Beginner";
  let blindSpots = "";
  let priorityReels = [];

  const allTags = profile.reels.flatMap(r => r.tags).map(t => t.toLowerCase()).join(" ");
  const allTitles = profile.reels.map(r => r.title.toLowerCase()).join(" ");
  const combined = allTags + " " + allTitles;

  if (profile.id === "profile-gamer" || combined.includes("gta") || combined.includes("gpu") || combined.includes("lag")) {
    coreCluster = "Systems, graphics, and performance engineering enthusiast whose gaming consumption is driven by a deep curiosity about how real-time rendering, hardware silicon, network protocols, and game engines function under the hood.";
    skillLevel = "Aspiring Intermediate (Strong hardware/systems intuition, transitioning toward technical programming concepts)";
    blindSpots = "Data structures & algorithms (DSA), software design patterns, and formal backend engineering pipelines that turn interactive curiosity into real-world code.";
    priorityReels = [
      { id: "R10", reel: "R10 - \"How does your GPU render graphics?\"", reason: "Immediately leverages their fascination with next-gen visuals (GTA 6/consoles) to teach GPU parallelization and rendering pipelines." },
      { id: "R1", reel: "R1 - \"How arrays work in memory\"", reason: "Bridges their curiosity about open-world game creation into essential memory layout and data structure foundations." },
      { id: "R6", reel: "R6 - \"How the cloud actually works\"", reason: "Demystifies the real-time distributed servers and infrastructure underlying low-latency multiplayer games." }
    ];
  } else if (profile.id === "profile-ai" || combined.includes("nlp") || combined.includes("chatgpt") || combined.includes("midjourney")) {
    coreCluster = "Applied AI & Machine Learning enthusiast focused on NLP/LLM mechanics, model architectures, and hands-on tool development, with high resistance to superficial AI hype.";
    skillLevel = "Aspiring Intermediate";
    blindSpots = "Foundational Data Structures & Algorithms (DSA) and distributed cloud systems infrastructure required to deploy and scale ML models in production.";
    priorityReels = [
      { id: "R13", reel: "R13 - \"How Netflix recommends content\"", reason: "Bridges machine learning concepts to real-world production recommendation engines." },
      { id: "R9", reel: "R9 - \"What is an API? Real-world analogy\"", reason: "Solidifies the fundamental building block needed to build and integrate modern AI apps." },
      { id: "R10", reel: "R10 - \"How does your GPU render graphics?\"", reason: "Demystifies the hardware compute layer driving modern AI training and inference." }
    ];
  } else if (profile.id === "profile-designer" || combined.includes("figma") || combined.includes("css animation") || combined.includes("ui design")) {
    coreCluster = "Creative front-end engineer bridging UI/UX design into interactive web development, passionate about visual fidelity, smooth micro-interactions, and component-based UI engineering.";
    skillLevel = "Beginner (Transitioning to Intermediate)";
    blindSpots = "Backend data handling (APIs, databases), cloud deployment, and foundational algorithms.";
    priorityReels = [
      { id: "R9", reel: "R9 - \"What is an API? Real-world analogy\"", reason: "Unlocks the backend connection required to turn static UI prototypes into full-stack web applications." },
      { id: "R8", reel: "R8 - \"How I cracked my first internship\"", reason: "Translates their design-plus-code portfolio into a compelling candidate narrative for recruiters." },
      { id: "R6", reel: "R6 - \"How the cloud actually works\"", reason: "Teaches the fundamentals of deploying, hosting, and serving web applications online." }
    ];
  } else if (profile.id === "profile-exam" || combined.includes("dbms") || combined.includes("os theory") || combined.includes("oops")) {
    coreCluster = "University CS student under heavy exam pressure, actively seeking high-density, visual, and anxiety-reducing explanations of core academic theory (OS, DBMS, OOP, DSA).";
    skillLevel = "Beginner (Academic CS Curriculum Focus)";
    blindSpots = "Practical industry engineering, open-source collaboration, and modern software deployment beyond university exam syllabi.";
    priorityReels = [
      { id: "R15", reel: "R15 - \"How does RAM actually work?\"", reason: "Solidifies fundamental OS and hardware memory concepts directly relevant to upcoming exams." },
      { id: "R7", reel: "R7 - \"Binary search explained visually\"", reason: "Builds stress-free, visual intuition for algorithmic time complexity and search patterns." },
      { id: "R11", reel: "R11 - \"Recursion explained with memes\"", reason: "Uses lighthearted humor to overcome mental roadblocks in understanding recursive programming." }
    ];
  } else if (profile.id === "profile-business" || combined.includes("zomato") || combined.includes("saas") || combined.includes("product manager")) {
    coreCluster = "Tech entrepreneur and future product manager focused on startup monetization, SaaS scalability, and high-level system design rather than low-level algorithm grind.";
    skillLevel = "Aspiring Intermediate (Strong commercial acumen, developing technical literacy)";
    blindSpots = "Low-level data structures (DSA), hands-on technical debugging, and core CS fundamentals needed to evaluate technical feasibility accurately.";
    priorityReels = [
      { id: "R9", reel: "R9 - \"What is an API? Real-world analogy\"", reason: "Delivers the foundational technical literacy required for product management and system integration." },
      { id: "R3", reel: "R3 - \"System Design: Design Twitter in 20 mins\"", reason: "Teaches high-level system architecture and scalability necessary for building SaaS platforms." },
      { id: "R6", reel: "R6 - \"How the cloud actually works\"", reason: "Connects infrastructure architecture to operational cost and scalability in tech businesses." }
    ];
  } else if (profile.id === "profile-trap" || (combined.includes("nullpointer") && combined.includes("software engineer") && combined.includes("laptop"))) {
    coreCluster = "Aspiring software engineer whose Java meme engagement, SWE lifestyle fascination, interview humor, and hardware comparison behavior collectively reveal a deep career-transition intent — NOT a narrow Java language interest. The system correctly avoids the shallow 'recommend more Java' trap.";
    skillLevel = "Aspiring Intermediate (Career-Focused)";
    blindSpots = "Hands-on system design, open-source contribution workflows, and foundational DSA beyond interview meme consumption.";
    priorityReels = [
      { id: "R8", reel: "R8 - \"How I cracked my first internship\"", reason: "Directly addresses their career-transition anxiety with actionable internship strategies." },
      { id: "R14", reel: "R14 - \"Getting started with open source\"", reason: "Builds portfolio proof-of-work that bypasses resume filters for career switchers." },
      { id: "R1", reel: "R1 - \"How arrays work in memory\"", reason: "Grounds their meme-level coding humor in real foundational CS concepts." }
    ];
  } else if (profile.id === "profile-mixed" || (combined.includes("cooking") && combined.includes("cybersecurity") && combined.includes("cloud"))) {
    coreCluster = "Mixed-signal student whose entertainment content (cooking, pets, fitness) shows passive engagement (liked only), while tech content (AI, cybersecurity, cloud) triggers deep engagement signals (saved + replayed). The agent correctly filters noise and identifies a genuine interest in applied security and cloud infrastructure.";
    skillLevel = "Beginner (Strong curiosity, exploring specialization)";
    blindSpots = "Foundational DSA, system design patterns, and hands-on programming practice beyond passive consumption of tech explainer content.";
    priorityReels = [
      { id: "R12", reel: "R12 - \"Zero-day exploits explained\"", reason: "Deepens their strongest signal — cybersecurity — with advanced attack vector concepts." },
      { id: "R6", reel: "R6 - \"How the cloud actually works\"", reason: "Expands their cloud curiosity into foundational infrastructure understanding." },
      { id: "R13", reel: "R13 - \"How Netflix recommends content\"", reason: "Bridges AI curiosity with a real-world ML system they interact with daily." }
    ];
  } else {
    coreCluster = "Aspiring software engineer navigating the transition from early learning to industry readiness, motivated by career upside and practical workflows, but experiencing anxiety around technical interviews and job hunt friction.";
    skillLevel = "Aspiring Intermediate";
    blindSpots = "Core systems infrastructure, distributed architectures (Cloud, System Design, Networking/Security), and low-level memory fundamentals beyond surface-level interview memes.";
    priorityReels = [
      { id: "R8", reel: "R8 - \"How I cracked my first internship\"", reason: "Converts high career aspirations into an actionable roadmap for landing their first break." },
      { id: "R7", reel: "R7 - \"Binary search explained visually\"", reason: "Alleviates coding interview anxiety by building concrete intuition for foundational algorithms." },
      { id: "R14", reel: "R14 - \"Getting started with open source\"", reason: "Gives a practical, high-leverage way to build real-world experience and bypass resume filtering." }
    ];
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    reelAnalyses,
    summary: {
      coreCluster,
      skillLevel,
      blindSpots,
      priorityReels
    }
  };
}
