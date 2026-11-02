import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { analyzeBook, cleanIsbn, identifyCover, isIsbn, lookupBook, type Analysis, type Book } from "./bookService";
import logoMark from "./assets/pageclarity-logo-mark.svg";

type Screen = "home" | "guestSetup" | "loading" | "results" | "history" | "settings" | "profile" | "accessibility" | "privacy" | "privacyPolicy" | "sources" | "contact" | "login" | "signup" | "bookstore" | "compare";
const normalizeValuesProfile = (value: string) => ["Conservative", "Moderate", "Custom"].includes(value) ? value : "Moderate";
type IconName =
  | "arrow"
  | "book"
  | "check"
  | "chevron"
  | "clock"
  | "flame"
  | "heart"
  | "home"
  | "language"
  | "leaf"
  | "scan"
  | "search"
  | "settings"
  | "share"
  | "sparkle"
  | "trash"
  | "user";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m15 18-6-6 6-6" />,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-2 4 0-4-2-7-4-8 0 5-3 7-3 12 0 5 3 8 7 8Z" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    language: <><path d="M4 5h7M7.5 3v2M5 9c3 0 5-2 5-4M4 5c0 2 2 4 5 5" /><path d="m13 19 4-10 4 10M14.5 16h5" /></>,
    leaf: <><path d="M11 20A7 7 0 0 1 9 6c5-2 10-1 11-1 0 1 1 7-2 11-2 3-5 4-7 4Z" /><path d="M8 21c1-6 5-9 10-13" /></>,
    scan: <><path d="M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3" /><path d="M7 8v8M10 8v8M14 8v8M17 8v8" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></>,
    sparkle: <path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" /><path d="M10 11v6M14 11v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark" aria-hidden="true">
        <img src={logoMark} alt="" />
      </div>
      <span className="wordmark">Page<span>Clarity</span></span>
    </div>
  );
}

function PrimaryButton({ children, onClick, icon }: { children: ReactNode; onClick?: () => void; icon?: IconName }) {
  return <button className="primary-button" onClick={onClick}>{icon && <Icon name={icon} />}{children}</button>;
}

function Header({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className={`top-bar ${title.length > 18 ? "long-title" : ""}`}>
      {onBack ? <button className="icon-button" onClick={onBack} aria-label="Go back"><Icon name="arrow" /></button> : <div className="icon-spacer" />}
      <strong>{title}</strong>
      {action || <div className="icon-spacer" />}
    </header>
  );
}

function TabBar({ active, navigate }: { active: Screen; navigate: (screen: Screen) => void }) {
  const tabs: { label: string; screen: Screen; icon: IconName }[] = [
    { label: "Home", screen: "home", icon: "home" },
    { label: "History", screen: "history", icon: "clock" },
    { label: "Settings", screen: "settings", icon: "settings" },
  ];
  return (
    <nav className="tab-bar" aria-label="Primary navigation">
      {tabs.map((tab) => <button key={tab.label} className={active === tab.screen ? "active" : ""} onClick={() => navigate(tab.screen)}><Icon name={tab.icon} /><span>{tab.label}</span></button>)}
    </nav>
  );
}

const categories: { name: string; status: string; tone: string; icon: IconName; presence: string; intensity: string; context: string }[] = [
  { name: "Violence", status: "Mild", tone: "mild", icon: "flame", presence: "Brief", intensity: "Gentle", context: "A farm animal is threatened, but no graphic harm is described." },
  { name: "Sexual Content", status: "None", tone: "clear", icon: "heart", presence: "None", intensity: "None", context: "No sexual content was identified in this edition." },
  { name: "Language", status: "None", tone: "clear", icon: "language", presence: "None", intensity: "None", context: "No strong or profane language was identified." },
  { name: "Substance Use", status: "None", tone: "clear", icon: "leaf", presence: "None", intensity: "None", context: "No substance use was identified." },
  { name: "LGBTQ+ Themes", status: "Present", tone: "present", icon: "user", presence: "Brief", intensity: "Gentle", context: "A brief thematic reference was identified without explicit content." },
  { name: "Mature Themes", status: "Mild", tone: "mild", icon: "sparkle", presence: "Recurring", intensity: "Gentle", context: "The story includes mortality, grief, and accepting the natural cycle of life." },
];

function Home({ onSearch, onProfile, onBookstore, onLogin, onSignup }: { onSearch: (query: string) => void; onProfile: () => void; onBookstore: () => void; onLogin: () => void; onSignup: () => void }) {
  const [query, setQuery] = useState("");
  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };
  type ChildProfile = { id: number; name: string; age: string; values: string };
  const [profiles] = useState<ChildProfile[]>(() => {
    try {
      if (window.localStorage.getItem("pageclarity-authenticated") !== "true") return [];
      const stored = window.localStorage.getItem("pageclarity-profiles");
      const parsed = JSON.parse(stored || "[]");
      return stored === null || parsed.length === 0 ? [] : parsed.map((item: ChildProfile) => ({ ...item, values: normalizeValuesProfile(item.values) }));
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState(() => {
    const stored = window.localStorage.getItem("pageclarity-active-profile");
    return stored !== null ? Number(stored) : profiles[0]?.id || 0;
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const activeChild = activeId === 0 ? null : profiles.find((item) => item.id === activeId) || profiles[0] || null;
  const switchChild = (id: number) => {
    setActiveId(id);
    window.localStorage.setItem("pageclarity-active-profile", String(id));
    setSwitcherOpen(false);
  };
  return (
    <main className="screen home-screen">
      <header className="home-header">
        <Logo />
        {activeChild ? <button className="active-child-button" onClick={() => setSwitcherOpen(true)} aria-label={`Switch active child. Currently ${activeChild.name}`}>
          <span>{activeChild ? activeChild.name.charAt(0).toUpperCase() : <Icon name="user" size={15} />}</span><strong>{activeChild?.name || "Guest"}</strong><Icon name="chevron" size={14} />
        </button> : <div className="guest-entry"><div className="active-child-button guest" aria-label="Guest mode"><span><Icon name="user" size={15} /></span><strong>Guest</strong></div><div className="guest-auth-links"><button onClick={onSignup}>Create account</button><i>or</i><button onClick={onLogin}>Log in</button></div></div>}
      </header>
      <section className="hero">
        <span className="eyebrow">YOUR FAMILY READING GUIDE</span>
        <h1>Look beyond<br />the <em>cover.</em></h1>
        <p>Instant context for the stories your child wants to read.</p>
      </section>
      <section className="scan-stage">
        <div className="scan-art" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <div className="standing-book book-one" />
          <div className="standing-book book-two"><span>STORY</span></div>
          <div className="standing-book book-three" />
          <div className="focus-corners" />
        </div>
        <div className="scan-copy">
          <span>RAPID CAMERA SCAN</span>
          <strong>Scan ISBN or cover</strong>
        </div>
        <button className="scan-trigger" onClick={onBookstore} aria-label="Open rapid book scanner"><Icon name="scan" size={23} /></button>
      </section>
      <form className="finder" onSubmit={submitSearch}>
        <Icon name="search" />
        <span><small>Rather type it?</small><input id="book-search" aria-label="Search books" placeholder="Title, author, or ISBN" value={query} onChange={(event) => setQuery(event.target.value)} enterKeyHint="search" /></span>
        <button type="submit" aria-label="Submit search" disabled={!query.trim()}><Icon name="arrow" /></button>
      </form>
      <section className="shelf-section">
        <div className="section-title"><h2>On parents’ shelves</h2><span>Explore</span></div>
        <div className="book-chips">
          <button onClick={() => onSearch("Wonder R. J. Palacio")}><i className="chip-cover wonder">W</i><span><strong>Wonder</strong><small>R. J. Palacio</small></span></button>
          <button onClick={() => onSearch("The Giver Lois Lowry")}><i className="chip-cover giver">G</i><span><strong>The Giver</strong><small>Lois Lowry</small></span></button>
          <button onClick={() => onSearch("The Wild Robot Peter Brown")}><i className="chip-cover wild">W</i><span><strong>Wild Robot</strong><small>Peter Brown</small></span></button>
        </div>
      </section>
      {switcherOpen && <div className="sheet-layer" onClick={() => setSwitcherOpen(false)}>
        <section className="child-switcher-sheet" onClick={(event) => event.stopPropagation()}>
          <button className="sheet-handle" onClick={() => setSwitcherOpen(false)} aria-label="Close profile switcher" />
          <span className="eyebrow">READING FOR</span>
          <h2>Choose a child</h2>
          <p>Book results will use the selected child’s values and sensitivity settings.</p>
          <div className="switcher-profiles">
            {profiles.length === 0 && <div className="no-profiles"><span><Icon name="user" /></span><strong>You’re scanning as a guest</strong><p>You can scan any book now. Create a profile whenever you want personalized guidance.</p></div>}
            {profiles.length > 0 && <button className={activeId === 0 ? "selected guest-choice" : "guest-choice"} onClick={() => switchChild(0)}>
              <span className="child-avatar guest-avatar"><Icon name="user" size={18} /></span>
              <span><strong>Guest mode</strong><small>Balanced defaults · Nothing personalized</small></span>
              {activeId === 0 ? <Icon name="check" /> : <Icon name="chevron" />}
            </button>}
            {profiles.map((item, index) => <button className={activeId === item.id ? "selected" : ""} key={item.id} onClick={() => switchChild(item.id)}>
              <span className={`child-avatar child-${index % 3}`}>{item.name.charAt(0).toUpperCase()}</span>
              <span><strong>{item.name}</strong><small>{item.age} · {item.values} lens</small></span>
              {activeId === item.id ? <Icon name="check" /> : <Icon name="chevron" />}
            </button>)}
          </div>
          <button className="manage-profiles" onClick={onProfile}><Icon name={profiles.length ? "settings" : "user"} size={17} /> {profiles.length ? "Manage or add profiles" : "Create your first profile"}</button>
        </section>
      </div>}
    </main>
  );
}

function GuestSetup({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const ages = ["0–2", "3–4", "5–6", "7–8", "9–10", "11–12", "13–14", "15–16", "17–18"];
  const [age, setAge] = useState("9–10");
  const [sensitivities, setSensitivities] = useState<Record<string, number>>(() => Object.fromEntries(categories.map((item) => [item.name, 1])));
  const continueAsGuest = () => {
    const highlightedCategories = categories.filter((item) => {
      const level = sensitivities[item.name];
      if (level === 0) return item.status !== "None";
      if (level === 1) return ["Moderate", "Strong"].includes(item.status);
      return false;
    }).map((item) => item.name);
    window.sessionStorage.setItem("pageclarity-guest-context", JSON.stringify({ age: `${age} years`, categories: highlightedCategories, sensitivities }));
    onContinue();
  };
  return (
    <main className="screen guest-setup-screen">
      <Header title="Quick Setup" onBack={onBack} />
      <div className="guest-setup-scroll">
        <div className="guest-setup-intro"><span className="eyebrow">ONE-TIME BOOK CHECK</span><h1>What should we keep in mind?</h1><p>This helps tailor this result. Nothing is saved as a child profile.</p></div>
        <section className="guest-question">
          <div className="question-number">01</div>
          <div className="question-heading"><h2>Reader’s age</h2><span>Improves age-aware guidance</span></div>
          <div className="age-grid">{ages.map((item) => <button className={age === item ? "selected" : ""} onClick={() => setAge(item)} key={item}>{item}</button>)}</div>
        </section>
        <section className="guest-question">
          <div className="question-number">02</div>
          <div className="question-heading"><h2>Content spectrum</h2><span>Choose what you want highlighted</span></div>
          <div className="guest-spectrum-radios">
            {categories.map((item) => <SensitivityControl key={item.name} label={item.name} icon={item.icon} level={sensitivities[item.name]} onChange={(level) => setSensitivities((current) => ({ ...current, [item.name]: level }))} />)}
          </div>
        </section>
      </div>
      <div className="guest-setup-action"><div><Icon name="user" size={16} /><span>Guest choices apply to this analysis only</span></div><PrimaryButton onClick={continueAsGuest}>Analyze This Book</PrimaryButton></div>
    </main>
  );
}

const loadingSteps = [
  { title: "Finding the book...", detail: "Matching the ISBN or title" },
  { title: "Analyzing content...", detail: "Checking 6 content categories" },
];

function Loading({ step = 1, error, onBack }: { step?: number; error?: string | null; onBack?: () => void }) {
  const current = loadingSteps[Math.min(step, loadingSteps.length - 1)];
  if (error) {
    return (
      <main className="screen loading-screen">
        <Logo />
        <div className="loading-content loading-error" role="alert">
          <div className="loader"><div><Icon name="search" size={30} /></div></div>
          <h1>We couldn’t find that book</h1>
          <p>{error}</p>
          <PrimaryButton onClick={onBack}>Try another search</PrimaryButton>
        </div>
      </main>
    );
  }
  return (
    <main className="screen loading-screen">
      <Logo />
      <div className="loading-content" aria-live="polite">
        <div className="loader"><div><Icon name="book" size={30} /></div></div>
        <h1>{current.title}</h1>
        <p>{current.detail}</p>
        <div className="loading-steps">{[0, 1, 2, 3].map((index) => <span key={index} className={index < (step + 1) * 2 ? "done" : ""} />)}</div>
      </div>
      <p className="loading-note">{step === 0 ? "This usually takes just a few seconds." : "A full analysis can take up to 30 seconds."}</p>
    </main>
  );
}

const categoryIcons: Record<string, IconName> = Object.fromEntries(categories.map((item) => [item.name, item.icon]));
const statusTone: Record<string, string> = { None: "clear", Mild: "mild", Present: "present", Moderate: "present", Strong: "strong" };
const statusWeight: Record<string, number> = { None: 0, Mild: 4, Present: 6, Moderate: 10, Strong: 16 };
const confidenceLabel = { high: "High", medium: "Medium", low: "Low" } as const;

function Results({ onBack, onScan, onCompare, onFlag, book, analysis, analysisError, onRetry }: { onBack: () => void; onScan: () => void; onCompare: () => void; onFlag: () => void; book?: Book | null; analysis?: Analysis | null; analysisError?: string | null; onRetry?: () => void }) {
  // Real analysis when available; otherwise the built-in Charlotte's Web demo.
  const resultCategories: typeof categories = analysis
    ? analysis.categories.map((item) => ({ ...item, icon: categoryIcons[item.name] || "book", tone: statusTone[item.status] || "mild" }))
    : categories;
  const realScore = (emphasis: string[]) => {
    const penalty = resultCategories.reduce((sum, item) => sum + (statusWeight[item.status] || 0) * (emphasis.includes(item.name) ? 2 : 1), 0);
    return Math.max(30, Math.min(99, 100 - penalty));
  };
  const realVerdict = (score: number) => score >= 85 ? "Light guidance" : score >= 70 ? "Review together" : "Review first";
  const withRealScore = <T extends { score: number; verdict: string; emphasis: string[] }>(lens: T): T => {
    if (!analysis) return lens;
    const score = realScore(lens.emphasis);
    return { ...lens, score, verdict: realVerdict(score) };
  };
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(book?.coverUrl) && !coverFailed;
  const clearCount = resultCategories.filter((item) => item.status === "None").length;
  const displayTitle = book?.title || "Charlotte’s Web";
  const displayAuthor = book ? book.authors.join(", ") || "Unknown author" : "E. B. White";
  const [selectedFlag, setSelectedFlag] = useState<(typeof categories)[number] | null>(null);
  const [feedbackFlag, setFeedbackFlag] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState("Inaccurate severity");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const activeFamilyProfile = (() => {
    try {
      if (window.localStorage.getItem("pageclarity-authenticated") !== "true") return { id: 0, name: "Guest", age: "General", values: "Moderate", sensitivities: {} };
      const stored = JSON.parse(window.localStorage.getItem("pageclarity-profiles") || "[]");
      const activeId = Number(window.localStorage.getItem("pageclarity-active-profile"));
      if (activeId === 0) return { id: 0, name: "Guest", age: "General", values: "Moderate", sensitivities: {} };
      return stored.find((item: { id: number }) => item.id === activeId) || stored[0] || { id: 0, name: "Guest", age: "General", values: "Moderate", sensitivities: {} };
    } catch {
      return { id: 0, name: "Guest", age: "General", values: "Moderate", sensitivities: {} };
    }
  })();
  activeFamilyProfile.values = normalizeValuesProfile(activeFamilyProfile.values);
  const guestContext: { age: string; categories: string[] } | null = (() => {
    if (activeFamilyProfile.name !== "Guest") return null;
    try { return JSON.parse(window.sessionStorage.getItem("pageclarity-guest-context") || "null"); } catch { return null; }
  })();
  const lensCatalog = [
    { name: "Moderate", short: "Balanced preset", score: 82, verdict: "Light guidance", emphasis: ["Violence", "Mature Themes"] },
    { name: "Conservative", short: "Values template", score: 70, verdict: "Review first", emphasis: ["Sexual Content", "Language", "LGBTQ+ Themes", "Mature Themes"] },
  ].map(withRealScore);
  const categorySettingNames: Record<string, string> = { "LGBTQ+ Themes": "Homosexuality" };
  const customEmphasis = resultCategories.filter((item) => activeFamilyProfile.sensitivities?.[categorySettingNames[item.name] || item.name] !== 2).map((item) => item.name);
  const savedLens = withRealScore(activeFamilyProfile.name === "Guest"
    ? { name: "Guest", short: "One-time choices", score: Math.max(64, 90 - (guestContext?.categories.length || 2) * 3), verdict: "Guest guidance", emphasis: guestContext?.categories || ["Violence", "Mature Themes"] }
    : activeFamilyProfile.values === "Custom"
    ? { name: "Custom", short: "Family-defined", score: Math.max(64, 90 - customEmphasis.length * 3), verdict: customEmphasis.length > 3 ? "Review together" : "Light guidance", emphasis: customEmphasis }
    : lensCatalog.find((item) => item.name === activeFamilyProfile.values) || lensCatalog[0]);
  const profiles = [
    { ...savedLens, name: activeFamilyProfile.name === "Guest" ? "Guest mode" : `${activeFamilyProfile.name}’s Profile`, short: activeFamilyProfile.name === "Guest" ? "Balanced defaults · No profile" : `${activeFamilyProfile.values} · Active child`, savedValues: activeFamilyProfile.values },
    ...lensCatalog.map((item) => ({ ...item, savedValues: item.name })),
  ];
  const lensChanges: Record<string, { category: string; from: string; to: string }[]> = {
    Moderate: [
      { category: "Violence", from: "Objective finding", to: "Moderate+ highlighted" },
      { category: "Mature Themes", from: "Objective finding", to: "Moderate+ highlighted" },
    ],
    Conservative: [
      { category: "Sexual Content", from: "Context only", to: "Prioritized" },
      { category: "Language", from: "Standard", to: "Prioritized" },
      { category: "Mature Themes", from: "Standard", to: "Prioritized" },
    ],
    Custom: customEmphasis.map((category) => ({ category, from: "Objective finding", to: "Your threshold" })),
  };
  const [profile, setProfile] = useState(profiles[0]);
  const [profileSheet, setProfileSheet] = useState(false);
  const [comparingProfiles, setComparingProfiles] = useState(false);
  return (
    <main className="screen results-screen">
      <Header title="Book Results" onBack={onBack} action={<button className="icon-button" aria-label="Share"><Icon name="share" /></button>} />
      <div className="scroll-content">
        <section className="result-hero">
          <div className="result-backdrop"><span>{displayTitle.toUpperCase()}</span></div>
          {book ? <div className={`book-cover ${showCover ? "has-image" : ""}`}>{showCover ? <img src={book.coverUrl} alt={`Cover of ${book.title}`} onError={() => setCoverFailed(true)} /> : <><Icon name="book" size={34} /><strong>{book.title.toUpperCase()}</strong><small>{displayAuthor.toUpperCase()}</small></>}</div>
            : <div className="book-cover"><span>CHARLOTTE’S</span><Icon name="sparkle" size={34} /><strong>WEB</strong><small>E. B. WHITE</small></div>}
          <div className="book-info"><span className="eyebrow">{book ? (analysis ? "ANALYSIS COMPLETE" : "BOOK FOUND") : "SAMPLE ANALYSIS"}</span><h1>{book ? book.title : <>Charlotte’s<br />Web</>}</h1><p>{book ? [displayAuthor, book.year].filter(Boolean).join(" · ") : "E. B. White · 1952"}</p>{(analysis || !book) && <span className="age-badge">{guestContext ? `Viewed for age ${guestContext.age}` : `Best for ages ${analysis?.ageRange || "8–12"}`}</span>}</div>
        </section>
        {activeFamilyProfile.name === "Guest" ? <div className="profile-lens guest-result-lens">
          <span><small>VIEWED THROUGH</small><strong>Guest choices</strong></span>
          <span className="lens-action">One-time settings</span>
        </div> : <button className="profile-lens" onClick={() => setProfileSheet(true)}>
          <span><small>VIEWED THROUGH</small><strong>{profile.name}</strong></span>
          <span className="lens-action">Change lens <Icon name="chevron" size={14} /></span>
        </button>}
        {activeFamilyProfile.name === "Guest" && <p className="profile-nudge">Create a profile to save sensitivities and see personalized age guidance.</p>}
        {book && !analysis ? <section className="analysis-error" role="alert">
          <Icon name="sparkle" size={22} />
          <div><strong>The content analysis didn’t load</strong><p>{analysisError || "The analysis service isn’t reachable right now."}</p></div>
          {onRetry && <button onClick={onRetry}>Try again</button>}
        </section> : <>
        <section className="clarity-strip">
          <div><span className="score">{profile.score}</span><small>PROFILE<br />MATCH</small></div>
          <p>{profile.verdict} for {activeFamilyProfile.name}. The factual book analysis remains unchanged.</p>
        </section>
        <section className="spectrum">
          <div className="spectrum-heading"><div><span className="eyebrow">CONTENT SPECTRUM</span><h2>What’s in the story</h2></div><span className="clear-count"><Icon name="check" size={14} /> {clearCount} all clear</span></div>
          <div className="spectrum-grid">
            {resultCategories.map((item, index) => <button className={`spectrum-tile tile-${index + 1} ${profile.emphasis.includes(item.name) ? "lens-emphasis" : ""}`} key={item.name} onClick={() => setSelectedFlag(item)}>
              <div className="tile-top"><span><Icon name={item.icon} size={18} /></span><small className={`status ${item.tone}`}>{item.status}</small></div>
              <strong>{item.name}</strong>
              <div className={`intensity ${item.tone}`}><i /><i /><i /><i /></div>
              {profile.emphasis.includes(item.name) && <span className="lens-highlight">PROFILE HIGHLIGHT</span>}
              <span className="sr-context">{item.name}: {item.status}. Presence {item.presence}. Intensity {item.intensity}. Activate for evidence and context.</span>
            </button>)}
          </div>
        </section>
        <div className="editorial-note"><span>THE SHORT VERSION</span><p>{analysis ? analysis.summary : "This classic explores friendship and loss, including the natural death of a beloved character."}</p><i>PC</i></div>
        <section className="discussion-block">
          <span className="eyebrow">READ TOGETHER</span>
          <h2>Conversation starters</h2>
          {(analysis ? analysis.conversationStarters : ["Why does Charlotte choose to help Wilbur?", "How does the story help us think about saying goodbye?"]).map((question, index) => <button key={question}><span>{String(index + 1).padStart(2, "0")}</span>{question}</button>)}
        </section>
        {analysis ? <section className="trust-block">
          <div><span className="trust-score">{confidenceLabel[analysis.confidence]}</span><span><strong>{confidenceLabel[analysis.confidence]} confidence</strong><small>{analysis.known ? "AI analysis generated just now" : "Limited: this book isn’t well known to the AI"}</small></span></div>
          <dl><div><dt>Edition</dt><dd>{[book?.publisher, book?.year].filter(Boolean).join(", ") || "Not listed"}</dd></div><div><dt>ISBN</dt><dd>{book?.isbn || "Not listed"}</dd></div><div><dt>Community</dt><dd>No reviews yet</dd></div></dl>
        </section> : <section className="trust-block">
          <div><span className="trust-score">94%</span><span><strong>High confidence</strong><small>Analysis updated today</small></span></div>
          <dl><div><dt>Edition</dt><dd>HarperCollins, 2012</dd></div><div><dt>Sources checked</dt><dd>6 trusted sources</dd></div><div><dt>Community</dt><dd>128 confirmations</dd></div></dl>
        </section>}
        </>}
        <aside className="result-disclaimer">
          <Icon name="book" size={17} />
          <p>{analysis ? "This analysis was written by AI from what it knows about the book and the publisher’s description. It can miss nuance or be wrong." : "Analysis uses public book descriptions and reviews. We haven’t independently read every book, and AI may miss nuance."} <button onClick={onFlag}>Flag it for review.</button></p>
        </aside>
        <button className="compare-link" onClick={onCompare}><span><Icon name="book" /> Compare with another book</span><Icon name="chevron" /></button>
      </div>
      <div className="sticky-action"><PrimaryButton icon="scan" onClick={onScan}>Scan Another Book</PrimaryButton></div>
      {selectedFlag && <div className="sheet-layer" onClick={() => setSelectedFlag(null)}>
        <section className="flag-sheet" onClick={(event) => event.stopPropagation()}>
          <button className="sheet-handle" onClick={() => setSelectedFlag(null)} aria-label="Close details" />
          <div className="sheet-title"><span><Icon name={selectedFlag.icon} /></span><div><small>CONTENT DETAIL</small><h2>{selectedFlag.name}</h2></div><span className={`status ${selectedFlag.tone}`}>{selectedFlag.status}</span></div>
          <div className="signal-pair"><div><small>PRESENCE</small><strong>{selectedFlag.presence}</strong><p>How often it appears</p></div><div><small>INTENSITY</small><strong>{selectedFlag.intensity}</strong><p>How explicit it is</p></div></div>
          <div className="context-note"><span>What we found</span><p>{selectedFlag.context}</p>{!analysis && <small>References: Chapters 8, 19 and 21 · May contain spoilers</small>}</div>
          <div className="profile-reason"><Icon name="user" size={18} /><p><strong>Why you’re seeing this</strong>{profile.emphasis.includes(selectedFlag.name) ? `Prioritized by ${profile.name} for ${activeFamilyProfile.name}.` : `Shown as part of the objective analysis for ${activeFamilyProfile.name}.`}</p></div>
          <PrimaryButton onClick={() => setSelectedFlag(null)}>Got it</PrimaryButton>
          <button className="report-analysis" onClick={() => { setFeedbackSent(false); setFeedbackFlag(selectedFlag.name); setSelectedFlag(null); }}>Something looks wrong? Report analysis</button>
        </section>
      </div>}
      {profileSheet && <div className="sheet-layer" onClick={() => setProfileSheet(false)}>
        <section className="profile-sheet" onClick={(event) => event.stopPropagation()}>
          <button className="sheet-handle" onClick={() => setProfileSheet(false)} aria-label="Close profiles" />
          <div className="profile-sheet-heading"><div><span className="eyebrow">PROFILE LENS</span><h2>{comparingProfiles ? "Compare interpretations" : "View through another lens"}</h2></div><button onClick={() => setComparingProfiles(!comparingProfiles)}>{comparingProfiles ? "Choose profile" : "Compare"}</button></div>
          {!comparingProfiles ? <>
            <p className="sheet-intro">The book’s facts stay the same. A profile only changes which findings receive emphasis.</p>
            <div className="profile-options">
              {profiles.map((item) => <button className={profile.name === item.name ? "selected" : ""} key={item.name} onClick={() => setProfile(item)}>
                <span className="profile-initial">{item.name.charAt(0)}</span>
                <span><strong>{item.name}</strong><small>{item.short} · {item.emphasis.length} highlights</small></span>
                <b>{item.score}</b>
                {profile.name === item.name && <Icon name="check" size={17} />}
              </button>)}
            </div>
            <PrimaryButton onClick={() => setProfileSheet(false)}>Apply Profile Lens</PrimaryButton>
          </> : <>
            <div className="profile-versus"><div><small>ACTIVE CHILD</small><strong>{activeFamilyProfile.name} · {activeFamilyProfile.values}</strong><b>{savedLens.score}</b><span>{savedLens.emphasis.length} highlights</span></div><i>vs</i><div><small>OBJECTIVE BASELINE</small><strong>Neutral</strong><b>86</b><span>2 highlights</span></div></div>
            <div className="profile-differences">
              <span>WHAT CHANGES</span>
              {lensChanges[activeFamilyProfile.values]?.map((change) => <div key={change.category}><strong>{change.category}</strong><p>{change.from} <Icon name="arrow" size={13} /> {change.to}</p></div>)}
              <div className="unchanged"><strong>Book facts</strong><p>Unchanged across every lens</p></div>
            </div>
            <div className="facts-note"><Icon name="check" size={17} /><p><strong>One analysis, different emphasis</strong>Profiles never change what we found in the book—only how prominently each finding is shown.</p></div>
          </>}
        </section>
      </div>}
      {feedbackFlag && <div className="sheet-layer" onClick={() => setFeedbackFlag(null)}>
        <section className="feedback-sheet" onClick={(event) => event.stopPropagation()}>
          <button className="sheet-handle" onClick={() => setFeedbackFlag(null)} aria-label="Close feedback" />
          {!feedbackSent ? <>
            <span className="eyebrow">HELP IMPROVE PAGECLARITY</span>
            <h2>Report {feedbackFlag}</h2>
            <p>What should we review? Your report is checked by our content team and never changes a result automatically.</p>
            <div className="feedback-options">
              {["Inaccurate severity", "Missing context", "Incorrect category", "Wrong page reference"].map((item) => <button className={feedbackType === item ? "selected" : ""} onClick={() => setFeedbackType(item)} key={item}><span>{feedbackType === item && <Icon name="check" size={13} />}</span>{item}</button>)}
            </div>
            <label className="feedback-note"><span>Additional detail <small>Optional</small></span><textarea placeholder="Tell us what you noticed..." /></label>
            <PrimaryButton onClick={() => setFeedbackSent(true)}>Submit for Review</PrimaryButton>
          </> : <div className="feedback-thanks" aria-live="polite"><div className="success-mark"><Icon name="check" size={26} /></div><h2>Thanks for the context.</h2><p>Your report has been queued for review. We’ll use it to improve future analyses.</p><PrimaryButton onClick={() => { setFeedbackFlag(null); setFeedbackSent(false); }}>Done</PrimaryButton></div>}
        </section>
      </div>}
    </main>
  );
}

function History({ navigate }: { navigate: (screen: Screen) => void }) {
  const books = [
    { title: "Charlotte’s Web", author: "E. B. White", date: "Today", status: "Review", cover: "cw" },
    { title: "The Wild Robot", author: "Peter Brown", date: "May 18", status: "All Clear", cover: "wr" },
    { title: "The Giver", author: "Lois Lowry", date: "May 12", status: "Flagged", cover: "tg" },
  ];
  return (
    <main className="screen history-screen">
      <div className="page-heading"><span className="eyebrow">YOUR LIBRARY</span><h1>Scan History</h1><p>Books you’ve checked recently.</p></div>
      <div className="history-list">
        {books.map((book) => <button className="history-card" key={book.title} onClick={() => navigate("results")}><div className={`mini-cover ${book.cover}`}><Icon name="book" /></div><div className="history-copy"><strong>{book.title}</strong><span>{book.author}</span><small>{book.date}</small></div><div className="history-status"><span className={book.status.toLowerCase().replace(" ", "-")}>{book.status}</span><Icon name="chevron" size={18} /></div></button>)}
      </div>
      <TabBar active="history" navigate={navigate} />
    </main>
  );
}

function SensitivityControl({ label, icon, level, onChange, disabled = false }: { label: string; icon: IconName; level: number; onChange: (level: number) => void; disabled?: boolean }) {
  const options = [
    { label: "None", value: 2 },
    { label: "Moderate", value: 1 },
    { label: "Any", value: 0 },
  ];
  return <div className={`toggle-row sensitivity-control ${disabled ? "preset-locked" : ""}`}><span className="toggle-label"><span><Icon name={icon} size={18} /></span>{label}</span><div className="sensitivity-radio" role="radiogroup" aria-label={`${label} sensitivity`}>{options.map((option) => <button role="radio" aria-checked={level === option.value} disabled={disabled} className={level === option.value ? "selected" : ""} onClick={() => onChange(option.value)} key={option.label}><i />{option.label}</button>)}</div></div>;
}

function ProfileEditor({ navigate, isNew }: { navigate: (screen: Screen) => void; isNew: boolean }) {
  type SavedProfile = { id: number; name: string; age: string; values: string; sensitivities: Record<string, number> };
  const sensitivityItems: { label: string; icon: IconName }[] = [
    { label: "Violence", icon: "flame" },
    { label: "Sexual Content", icon: "heart" },
    { label: "Language", icon: "language" },
    { label: "Substance Use", icon: "leaf" },
    { label: "Homosexuality", icon: "user" },
    { label: "Mature Themes", icon: "sparkle" },
  ];
  const defaultSensitivities = Object.fromEntries(sensitivityItems.map((item) => [item.label, 1]));
  const [name, setName] = useState(isNew ? "" : "Jamie");
  const [age, setAge] = useState(isNew ? "0–2 years" : "9–10 years");
  const [profile, setProfile] = useState("Moderate");
  const [sensitivities, setSensitivities] = useState<Record<string, number>>(defaultSensitivities);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("pageclarity-profiles") || "[]");
    } catch {
      return [];
    }
  });
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);
  const presets: Record<string, Record<string, number>> = {
    Moderate: { "Violence": 1, "Sexual Content": 1, "Language": 1, "Substance Use": 1, "Homosexuality": 1, "Mature Themes": 1 },
    Conservative: { "Violence": 1, "Sexual Content": 0, "Language": 0, "Substance Use": 0, "Homosexuality": 0, "Mature Themes": 0 },
  };

  const selectValuesProfile = (nextProfile: string) => {
    setProfile(nextProfile);
    if (presets[nextProfile]) setSensitivities(presets[nextProfile]);
  };

  const saveProfile = () => {
    const next = { id: Date.now(), name: name.trim() || "New child", age, values: profile, sensitivities };
    const updated = [...savedProfiles, next];
    setSavedProfiles(updated);
    window.localStorage.setItem("pageclarity-profiles", JSON.stringify(updated));
    if (savedProfiles.length === 0) window.localStorage.setItem("pageclarity-active-profile", String(next.id));
    setSavedProfile(next);
  };

  const createAnother = () => {
    setName("");
    setAge("0–2 years");
    setProfile("Moderate");
    setSensitivities(presets.Moderate);
    setSavedProfile(null);
  };

  return (
    <main className="screen settings-screen">
      <Header title={isNew ? "New Child Profile" : "Edit Child Profile"} onBack={() => navigate("settings")} />
      <div className="page-heading compact profile-editor-heading"><span className="eyebrow">PERSONALIZE</span><h1>{isNew ? "Create a profile" : "Jamie’s Profile"}</h1><p>Tailor recommendations for your family.</p></div>
      <div className="settings-scroll">
        {savedProfiles.length > 0 && <section className="saved-profile-strip">
          <div><span className="eyebrow">SAVED PROFILES</span><strong>{savedProfiles.length} {savedProfiles.length === 1 ? "child" : "children"}</strong></div>
          <div className="saved-avatars">{savedProfiles.slice(-3).map((item) => <span key={item.id} title={item.name}>{item.name.charAt(0).toUpperCase()}</span>)}</div>
        </section>}
        <section className="settings-card">
          <div className="settings-title"><span><Icon name="user" /></span><div><h2>Child Profile</h2><p>Basic details for better guidance</p></div></div>
          <label className="field"><span>Child’s name</span><input placeholder="Enter name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field"><span>Age range</span><select value={age} onChange={(event) => setAge(event.target.value)}><option>0–2 years</option><option>3–4 years</option><option>5–6 years</option><option>7–8 years</option><option>9–10 years</option><option>11–12 years</option><option>13–14 years</option><option>15–16 years</option><option>17–18 years</option></select></label>
          <div className="field"><span>Values profile</span><div className="profile-pills three-options">{["Conservative", "Moderate", "Custom"].map((item) => <button className={profile === item ? "selected" : ""} onClick={() => selectValuesProfile(item)} key={item}>{item}</button>)}</div></div>
        </section>
        <section className="settings-card sensitivity">
          <div className="settings-title"><span><Icon name="settings" /></span><div><h2>Flag Sensitivity</h2><p>Choose the minimum level you want highlighted</p></div></div>
          {profile !== "Custom" && <div className="preset-notice"><Icon name="check" size={16} /><p><strong>{profile} preset applied</strong>Select Custom to adjust individual categories.</p></div>}
          {sensitivityItems.map((item) => <SensitivityControl key={item.label} label={item.label} icon={item.icon} level={sensitivities[item.label]} disabled={profile !== "Custom"} onChange={(level) => setSensitivities((current) => ({ ...current, [item.label]: level }))} />)}
        </section>
        <PrimaryButton onClick={saveProfile}>Save Profile</PrimaryButton>
      </div>
      {savedProfile && <div className="sheet-layer" onClick={() => setSavedProfile(null)}>
        <section className="save-success-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="success-mark"><Icon name="check" size={26} /></div>
          <span className="eyebrow">PROFILE SAVED</span>
          <h2>{savedProfile.name} is all set.</h2>
          <p>PageClarity will now use this {savedProfile.values.toLowerCase()} profile when highlighting books for ages {savedProfile.age}.</p>
          <PrimaryButton onClick={createAnother}>Create Another Profile</PrimaryButton>
          <button className="done-button" onClick={() => navigate("settings")}>Done for now</button>
        </section>
      </div>}
    </main>
  );
}

function SettingsOverview({ navigate, addProfile, editProfile, onLogin, onSignup, onSignOut }: { navigate: (screen: Screen) => void; addProfile: () => void; editProfile: () => void; onLogin: () => void; onSignup: () => void; onSignOut: () => void }) {
  type ProfileSummary = { id: number; name: string; age: string; values: string };
  const isAuthenticated = window.localStorage.getItem("pageclarity-authenticated") === "true";
  const account: { name: string; email: string } | null = (() => {
    if (!isAuthenticated) return null;
    try { return JSON.parse(window.localStorage.getItem("pageclarity-account") || "null"); } catch { return null; }
  })();
  const [profiles, setProfiles] = useState<ProfileSummary[]>(() => {
    try {
      if (!isAuthenticated) return [];
      const stored = window.localStorage.getItem("pageclarity-profiles");
      return stored === null ? [] : JSON.parse(stored).map((item: ProfileSummary) => ({ ...item, values: normalizeValuesProfile(item.values) }));
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<number>(() => Number(window.localStorage.getItem("pageclarity-active-profile")) || profiles[0]?.id || 0);
  const [deleteProfile, setDeleteProfile] = useState<ProfileSummary | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const preferenceRows: { icon: IconName; title: string; detail: string }[] = [
    { icon: "user", title: "Accessibility", detail: "Text, contrast, motion and narration" },
    { icon: "check", title: "Privacy & Family Data", detail: "Manage stored information" },
    { icon: "book", title: "Sources & Methodology", detail: "How PageClarity analyzes books" },
  ];
  const selectActive = (id: number) => {
    setActiveId(id);
    window.localStorage.setItem("pageclarity-active-profile", String(id));
  };
  const confirmDelete = () => {
    if (!deleteProfile) return;
    const updated = profiles.filter((item) => item.id !== deleteProfile.id);
    setProfiles(updated);
    window.localStorage.setItem("pageclarity-profiles", JSON.stringify(updated));
    if (activeId === deleteProfile.id) {
      const nextId = updated[0]?.id || 0;
      setActiveId(nextId);
      window.localStorage.setItem("pageclarity-active-profile", String(nextId));
    }
    setDeleteProfile(null);
  };
  return (
    <main className="screen settings-overview">
      <div className="settings-overview-scroll">
        <header className="settings-heading"><span className="eyebrow">PAGECLARITY</span><h1>Your Account</h1></header>
        {account ? <section className="parent-card">
          <div className="parent-avatar">{account.name.split(" ").map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase()}<i /></div>
          <div><span>Parent account</span><strong>{account.name}</strong><small>{account.email}</small></div>
          <button aria-label="Edit parent information"><Icon name="chevron" /></button>
        </section> : <section className="guest-account-card">
          <div><span className="eyebrow">OPTIONAL ACCOUNT</span><h2>Keep your family setup safe.</h2><p>Sync profiles and scan history across devices. Scanning always works without an account.</p></div>
          <div><button onClick={onSignup}>Create account</button><button onClick={onLogin}>Log in</button></div>
        </section>}
        {isAuthenticated && <section className="profile-summary-section">
          <div className="settings-section-heading"><div><span className="eyebrow">FAMILY PROFILES</span><h2>Your children</h2></div></div>
          <div className="profile-summary-list">
            {profiles.length === 0 && <div className="empty-profile-summary"><Icon name="user" /><strong>No child profiles yet</strong><p>Add one for age-aware, values-based book guidance.</p></div>}
            {profiles.map((item, index) => <div className={`child-summary ${activeId === item.id ? "active-child" : ""}`} key={item.id}>
              <button className="child-main" onClick={() => selectActive(item.id)} aria-label={`Use ${item.name} as active profile`}>
                <span className={`child-avatar child-${index % 3}`}>{item.name.charAt(0).toUpperCase()}</span>
                <span className="child-copy"><strong>{item.name}{activeId === item.id && <b>ACTIVE</b>}</strong><small>{item.age} · {item.values} lens</small><i><b>6</b> sensitivities configured</i></span>
              </button>
              <div className="child-actions"><button onClick={editProfile} aria-label={`Edit ${item.name}`}><Icon name="settings" size={16} /></button><button onClick={() => setDeleteProfile(item)} aria-label={`Delete ${item.name}`}><Icon name="trash" size={16} /></button></div>
            </div>)}
          </div>
          <button className="add-child-card" onClick={addProfile}><span>+</span><div><strong>Create another child profile</strong><small>Personalize guidance for a different reader</small></div></button>
        </section>}
        <section className="settings-menu">
          <div className="settings-section-heading"><div><span className="eyebrow">PREFERENCES & TRUST</span><h2>App settings</h2></div></div>
          {preferenceRows.map((item) => <button key={item.title} onClick={() => item.title === "Accessibility" ? navigate("accessibility") : item.title === "Privacy & Family Data" ? navigate("privacy") : item.title === "Sources & Methodology" ? navigate("sources") : undefined}><span><Icon name={item.icon} size={18} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><Icon name="chevron" size={17} /></button>)}
        </section>
        <section className="contact-section">
          <div><span className="eyebrow">NEED A HAND?</span><h2>Contact us</h2><p>Questions, feedback, or a book result that needs a closer look? We’re here to help.</p></div>
          <button onClick={() => { setContactSent(false); setContactOpen(true); }}><Icon name="heart" size={17} /><span><strong>Send us a message</strong><small>Usually answered within 1–2 days</small></span><Icon name="chevron" size={16} /></button>
        </section>
        <div className="account-note"><Logo /><p>PageClarity never sells family reading data.</p>{isAuthenticated && <button onClick={onSignOut}>Sign out</button>}</div>
      </div>
      <TabBar active="settings" navigate={navigate} />
      {deleteProfile && <div className="sheet-layer" onClick={() => setDeleteProfile(null)}>
        <section className="delete-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="delete-mark"><Icon name="trash" /></div>
          <span className="eyebrow">DELETE PROFILE</span>
          <h2>Remove {deleteProfile.name}?</h2>
          <p>This removes their sensitivity settings from this device. Scan history will remain available.</p>
          <button className="destructive-button" onClick={confirmDelete}>Delete Child Profile</button>
          <button className="done-button" onClick={() => setDeleteProfile(null)}>Keep profile</button>
        </section>
      </div>}
      {contactOpen && <div className="sheet-layer" onClick={() => setContactOpen(false)}>
        <section className="contact-sheet" onClick={(event) => event.stopPropagation()}>
          <button className="sheet-handle" onClick={() => setContactOpen(false)} aria-label="Close contact form" />
          {!contactSent ? <>
            <span className="eyebrow">CONTACT PAGECLARITY</span>
            <h2>How can we help?</h2>
            <p>Send us a question, concern, or piece of feedback.</p>
            <form onSubmit={(event) => { event.preventDefault(); setContactSent(true); }}>
              <div className="contact-fields-row">
                <label className="auth-field"><span>Name</span><input required defaultValue={account?.name || ""} placeholder="Your name" /></label>
                <label className="auth-field"><span>Email address</span><input required type="email" defaultValue={account?.email || ""} placeholder="you@example.com" /></label>
              </div>
              <label className="auth-field"><span>Subject</span><input required placeholder="What is this about?" /></label>
              <label className="auth-field"><span>Concern or question</span><textarea required placeholder="Tell us how we can help..." /></label>
              <PrimaryButton>Send Message</PrimaryButton>
            </form>
          </> : <div className="feedback-thanks" aria-live="polite"><div className="success-mark"><Icon name="check" size={26} /></div><h2>Message received.</h2><p>Thanks for reaching out. The PageClarity team will get back to you shortly.</p><PrimaryButton onClick={() => setContactOpen(false)}>Done</PrimaryButton></div>}
        </section>
      </div>}
    </main>
  );
}

type AccessibilityPrefs = { largeText: boolean; reducedMotion: boolean; highContrast: boolean; screenReader: boolean };

function AccessibilitySettings({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("pageclarity-accessibility") || '{"largeText":false,"reducedMotion":false,"highContrast":false,"screenReader":true}');
    } catch {
      return { largeText: false, reducedMotion: false, highContrast: false, screenReader: true };
    }
  });
  const options: { key: keyof AccessibilityPrefs; title: string; detail: string; preview: string }[] = [
    { key: "largeText", title: "Larger text", detail: "Increase reading size across the app", preview: "Aa" },
    { key: "reducedMotion", title: "Reduced motion", detail: "Limit transitions and loading animation", preview: "—" },
    { key: "highContrast", title: "Enhanced contrast", detail: "Strengthen text, borders, and controls", preview: "◐" },
    { key: "screenReader", title: "Screen-reader detail", detail: "Add context to scores, flags, and icons", preview: "◖" },
  ];
  useEffect(() => {
    window.localStorage.setItem("pageclarity-accessibility", JSON.stringify(prefs));
    const root = document.documentElement;
    root.classList.toggle("large-text", prefs.largeText);
    root.classList.toggle("reduced-motion", prefs.reducedMotion);
    root.classList.toggle("high-contrast", prefs.highContrast);
    root.classList.toggle("screen-reader-detail", prefs.screenReader);
  }, [prefs]);
  return (
    <main className="screen accessibility-screen">
      <Header title="Accessibility" onBack={onBack} />
      <div className="accessibility-scroll">
        <div className="accessibility-intro"><span className="eyebrow">MAKE IT YOURS</span><h1>Comfortable for every reader.</h1><p>These preferences are saved on this device and apply immediately.</p></div>
        <section className="accessibility-preview" aria-live="polite"><span>PREVIEW</span><div><Logo /><p>A gentle story with themes worth discussing together.</p></div></section>
        <section className="accessibility-options">
          {options.map((item) => <button key={item.key} onClick={() => setPrefs((current) => ({ ...current, [item.key]: !current[item.key] }))} aria-pressed={prefs[item.key]}>
            <span className="accessibility-glyph">{item.preview}</span>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <span className={`access-switch ${prefs[item.key] ? "on" : ""}`}><i /></span>
          </button>)}
        </section>
        <div className="accessibility-help"><Icon name="heart" /><p><strong>Need another accommodation?</strong>Contact support and tell us what would make PageClarity easier to use.</p></div>
      </div>
    </main>
  );
}

function PrivacySettings({ onBack, onManageProfiles, onAccountDeleted, onContact, onPolicy }: { onBack: () => void; onManageProfiles: () => void; onAccountDeleted: () => void; onContact: () => void; onPolicy: () => void }) {
  const [historyDeleted, setHistoryDeleted] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const exportData = () => {
    const data = {
      account: JSON.parse(window.localStorage.getItem("pageclarity-account") || "null"),
      profiles: JSON.parse(window.localStorage.getItem("pageclarity-profiles") || "[]"),
      activeProfile: window.localStorage.getItem("pageclarity-active-profile"),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pageclarity-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const deleteAccount = () => {
    ["pageclarity-account", "pageclarity-authenticated", "pageclarity-profiles", "pageclarity-active-profile"].forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem("pageclarity-guest-context");
    onAccountDeleted();
  };
  return (
    <main className="screen privacy-screen">
      <Header title="Privacy & Family Data" onBack={onBack} />
      <div className="privacy-scroll">
        <div className="privacy-intro"><span className="eyebrow">PRIVACY, MADE CLEAR</span><h1>Your data, your control.</h1><p>PageClarity stores only what’s needed to protect your family’s reading experience. Here’s exactly what we have and how to manage it.</p></div>
        <section className="privacy-explainer">
          <div><span><Icon name="user" /></span><div><h2>What’s stored on your device</h2><p>Your child profiles, content settings, and scan history are saved locally on your device. This data never leaves your phone unless you’re signed into an account.</p></div></div>
          <div><span><Icon name="scan" /></span><div><h2>What’s sent to our servers</h2><p>When you scan a book, we send the ISBN or title to look up content information. This lookup is not linked to your identity. Your account email and subscription status are stored securely.</p></div></div>
        </section>
        <section className="never-sell"><Icon name="check" /><div><h2>We never sell your data.</h2><p>PageClarity does not share, sell, or monetize any information about you or your family.</p></div></section>
        <section className="data-actions">
          <div className="settings-section-heading"><div><span className="eyebrow">YOUR CONTROLS</span><h2>Manage your data</h2></div></div>
          <button onClick={() => { window.localStorage.removeItem("pageclarity-history"); setHistoryDeleted(true); }}><span><Icon name="clock" /></span><div><strong>{historyDeleted ? "Scan history deleted" : "Delete scan history"}</strong><small>{historyDeleted ? "History has been removed from this device" : "Remove all previously scanned books"}</small></div>{historyDeleted ? <Icon name="check" /> : <Icon name="chevron" />}</button>
          <button onClick={onManageProfiles}><span><Icon name="user" /></span><div><strong>Delete a child profile</strong><small>Choose a profile from Your Account</small></div><Icon name="chevron" /></button>
          <button onClick={exportData}><span><Icon name="share" /></span><div><strong>Export my data</strong><small>Download a copy as a JSON file</small></div><Icon name="chevron" /></button>
          <button className="delete-account-row" onClick={() => setDeleteAccountOpen(true)}><span><Icon name="trash" /></span><div><strong>Delete my account</strong><small>Permanently remove account and family data</small></div><Icon name="chevron" /></button>
        </section>
        <div className="privacy-links">
          <p>Questions? <button onClick={onContact}>Contact Us</button></p>
          <button onClick={onPolicy}>Read our full Privacy Policy <Icon name="chevron" size={15} /></button>
        </div>
      </div>
      {deleteAccountOpen && <div className="sheet-layer" onClick={() => setDeleteAccountOpen(false)}>
        <section className="delete-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="delete-mark"><Icon name="trash" /></div><span className="eyebrow">PERMANENT ACTION</span><h2>Delete your account?</h2><p>This permanently removes your account, child profiles, and saved preferences from this device.</p>
          <button className="destructive-button" onClick={deleteAccount}>Delete My Account</button><button className="done-button" onClick={() => setDeleteAccountOpen(false)}>Keep my account</button>
        </section>
      </div>}
    </main>
  );
}

function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen policy-screen">
      <Header title="Privacy Policy" onBack={onBack} />
      <div className="policy-meta"><div><span className="eyebrow">PAGECLARITY LLC</span><strong>Full Privacy Policy</strong><small>Last updated October 18, 2026</small></div><button onClick={() => window.open("/pageclarity-privacy-policy.pdf", "_blank")}><Icon name="share" size={16} /> Open</button></div>
      <iframe className="policy-document" src="/pageclarity-privacy-policy.pdf#toolbar=0&navpanes=0" title="PageClarity Privacy Policy" />
    </main>
  );
}

function SourcesMethodology({ onBack, onFlag }: { onBack: () => void; onFlag: () => void }) {
  const definitions = [
    ["Language", "Profanity, slurs, or crude humor"],
    ["Violence", "Physical harm, death, or graphic conflict"],
    ["Sexual content", "Romantic scenes, intimacy, or explicit material"],
    ["LGBTQ+ themes", "Characters or storylines involving same-sex relationships or gender identity"],
    ["Substance use", "Alcohol, drugs, or smoking depicted or normalized"],
    ["Mature themes", "Abuse, trauma, mental health, or heavy emotional content"],
  ];
  return (
    <main className="screen sources-screen">
      <Header title="Sources & Methodology" onBack={onBack} />
      <div className="sources-scroll">
        <div className="sources-intro"><span className="eyebrow">BEHIND EACH RESULT</span><h1>How PageClarity analyzes books.</h1><p>We combine publicly available book data with AI analysis to flag content based on your family’s settings. Here’s exactly how it works.</p></div>
        <section className="method-step"><span>01</span><div><h2>Where our book data comes from</h2><p>We pull titles, authors, descriptions, and genre information from Google Books and Open Library — two of the largest publicly available book databases.</p></div></section>
        <section className="method-step"><span>02</span><div><h2>How content is analyzed</h2><p>Our AI reviews each book’s known themes, plot summaries, and descriptions against your child’s content filter settings. It looks for language, violence, sexual content, LGBTQ+ themes, substance use, and mature subject matter — then flags only what falls outside your family’s chosen thresholds.</p></div></section>
        <section className="category-definitions">
          <span className="eyebrow">CONTENT GUIDE</span><h2>What each category means</h2>
          <dl>{definitions.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl>
        </section>
        <section className="limitations"><span><Icon name="sparkle" /></span><div><h2>Our honest limitations</h2><p>Our analysis is based on publicly available descriptions and reviews — we have not independently read every book in our database. Newer or lesser-known titles may have limited data. AI can miss nuance, so for books that matter most to your family, we always recommend reading a few reviews yourself.</p></div></section>
        <div className="flag-review"><p>Think we got a book wrong?</p><button onClick={onFlag}>Flag it for review <Icon name="chevron" size={15} /></button><span>Our team will take a closer look.</span></div>
      </div>
    </main>
  );
}

function ContactPage({ onBack, context }: { onBack: () => void; context: "review" | "general" }) {
  const [sent, setSent] = useState(false);
  const account: { name: string; email: string } | null = (() => {
    try { return JSON.parse(window.localStorage.getItem("pageclarity-account") || "null"); } catch { return null; }
  })();
  return (
    <main className="screen contact-page">
      <Header title="Contact Us" onBack={onBack} />
      <div className="contact-page-scroll">
        {!sent ? <>
          <div className="contact-page-intro"><span className="eyebrow">{context === "review" ? "FLAG FOR REVIEW" : "CONTACT PAGECLARITY"}</span><h1>{context === "review" ? "Tell us what looks wrong." : "How can we help?"}</h1><p>{context === "review" ? "Share the book and your concern. Our team will take a closer look at the analysis." : "Send us a privacy question, concern, or piece of feedback."}</p></div>
          <form onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
            <label className="auth-field"><span>Name</span><input required defaultValue={account?.name || ""} placeholder="Your name" /></label>
            <label className="auth-field"><span>Email address</span><input required type="email" defaultValue={account?.email || ""} placeholder="you@example.com" /></label>
            <label className="auth-field"><span>Subject</span><input required defaultValue={context === "review" ? "Book analysis review" : ""} placeholder="What is this about?" /></label>
            <label className="auth-field"><span>Concern or question</span><textarea required placeholder={context === "review" ? "Book title and what we should review..." : "Tell us how we can help..."} /></label>
            <PrimaryButton>{context === "review" ? "Submit for Review" : "Send Message"}</PrimaryButton>
          </form>
        </> : <div className="contact-page-success" aria-live="polite"><div className="success-mark"><Icon name="check" size={26} /></div><span className="eyebrow">MESSAGE RECEIVED</span><h1>Thanks for helping us improve.</h1><p>Our team will review the book information and your concern.</p><PrimaryButton onClick={onBack}>Back to Methodology</PrimaryButton></div>}
      </div>
    </main>
  );
}

function AuthScreen({ mode, onBack, onSwitch, onComplete }: { mode: "login" | "signup"; onBack: () => void; onSwitch: () => void; onComplete: (account: { name: string; email: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignup = mode === "signup";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password || (isSignup && !name)) return;
    const account = { name: isSignup ? name : "Sarah Mitchell", email };
    if (isSignup) {
      window.localStorage.setItem("pageclarity-profiles", "[]");
      window.localStorage.setItem("pageclarity-active-profile", "0");
    }
    window.localStorage.setItem("pageclarity-account", JSON.stringify(account));
    window.localStorage.setItem("pageclarity-authenticated", "true");
    onComplete(account);
  };
  return (
    <main className="screen auth-screen">
      <div className="auth-top"><button className="icon-button" onClick={onBack} aria-label="Go back"><Icon name="arrow" /></button><Logo /></div>
      <div className="auth-body">
        <span className="eyebrow">{isSignup ? "YOUR READING COMPANION" : "WELCOME BACK"}</span>
        <h1>{isSignup ? "Save what matters to your family." : "Continue your family’s reading journey."}</h1>
        <p>{isSignup ? "Sync profiles, preferences, and scan history across every device." : "Log in to restore your profiles and personalized guidance."}</p>
        <form onSubmit={submit}>
          {isSignup && <label className="auth-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Parent or guardian name" autoComplete="name" /></label>}
          <label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label className="auth-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} /></label>
          {!isSignup && <button type="button" className="forgot-link">Forgot password?</button>}
          <PrimaryButton>{isSignup ? "Create Free Account" : "Log In"}</PrimaryButton>
        </form>
        <div className="auth-trust"><span><Icon name="check" size={14} /> No account required to scan</span><span><Icon name="check" size={14} /> Family data stays private</span></div>
      </div>
      <div className="auth-switch"><span>{isSignup ? "Already have an account?" : "New to PageClarity?"}</span><button onClick={onSwitch}>{isSignup ? "Log in" : "Create an account"}</button></div>
    </main>
  );
}

const barcodeHints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);

function BookstoreMode({ onBack, onResults, onCompare, onFound }: { onBack: () => void; onResults: () => void; onCompare: () => void; onFound: (query: string) => void }) {
  const [scanned] = useState(2);
  const [flash, setFlash] = useState(false);
  const [scanMode, setScanMode] = useState<"isbn" | "cover">("isbn");
  const [camera, setCamera] = useState<"starting" | "live" | "unavailable">("starting");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanModeRef = useRef(scanMode);
  const foundRef = useRef(false);
  scanModeRef.current = scanMode;

  const finish = (query: string) => {
    if (foundRef.current) return;
    foundRef.current = true;
    onFound(query);
  };

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) { setCamera("unavailable"); return; }
      try {
        const reader = new BrowserMultiFormatReader(barcodeHints, { delayBetweenScanAttempts: 150 });
        controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current, (result) => {
          if (!result || scanModeRef.current !== "isbn") return;
          const text = result.getText();
          if (isIsbn(text)) { setFlash(true); finish(cleanIsbn(text)); }
        });
        if (cancelled) controls.stop(); else setCamera("live");
      } catch {
        if (!cancelled) setCamera("unavailable");
      }
    })();
    return () => { cancelled = true; controls?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureCover = async () => {
    const video = videoRef.current;
    if (!video || camera !== "live" || busy) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 350);
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    setBusy(true);
    setMessage("Reading the cover...");
    try {
      const cover = await identifyCover(image);
      if (cover.found && cover.title) finish(`${cover.title} ${cover.author}`.trim());
      else setMessage("We couldn’t read a title. Fill the frame with the cover and try again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t read that cover.");
    } finally {
      setBusy(false);
    }
  };

  const capture = () => {
    if (scanMode === "cover") { void captureCover(); return; }
    setMessage(camera === "live" ? "Barcodes scan automatically. Hold the ISBN barcode inside the frame." : null);
  };

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    if (isIsbn(manualIsbn)) finish(cleanIsbn(manualIsbn));
    else setMessage("Enter the 10 or 13 digit ISBN printed above the barcode.");
  };

  return (
    <main className={`screen bookstore-screen ${flash ? "captured" : ""}`}>
      <header className="camera-header"><button className="icon-button" onClick={onBack} aria-label="Go back"><Icon name="arrow" /></button><div><strong>Rapid Scan</strong><span>ISBN or book cover</span></div><span className="offline-dot">{camera === "live" ? "LIVE" : camera === "starting" ? "STARTING" : "NO CAMERA"}</span></header>
      <div className="camera-mode-switch" role="radiogroup" aria-label="Scan type"><button className={scanMode === "isbn" ? "selected" : ""} role="radio" aria-checked={scanMode === "isbn"} onClick={() => { setScanMode("isbn"); setMessage(null); }}><Icon name="scan" size={15} /> ISBN barcode</button><button className={scanMode === "cover" ? "selected" : ""} role="radio" aria-checked={scanMode === "cover"} onClick={() => { setScanMode("cover"); setMessage(null); }}><Icon name="book" size={15} /> Book cover</button></div>
      <div className={`camera-view camera-${camera}`}>
        <video ref={videoRef} className="camera-feed" muted playsInline autoPlay aria-hidden="true" />
        <div className="camera-grain" />
        {camera === "starting" && (scanMode === "isbn" ? <div className="barcode-art"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div> : <div className="cover-scan-art"><span>THE</span><strong>WILD<br />ROBOT</strong><i /><small>PETER BROWN</small></div>)}
        {camera !== "unavailable" && <div className={`scan-reticle ${scanMode}`}><span /><span /><span /><span /><div><Icon name={scanMode === "isbn" ? "scan" : "book"} size={18} /> Align {scanMode === "isbn" ? "an ISBN barcode" : "the entire book cover"}</div></div>}
        {camera === "unavailable" ? <form className="camera-fallback" onSubmit={submitManual}>
          <p>Camera isn’t available. Allow camera access in your browser settings, or type the ISBN.</p>
          <div><input id="manual-isbn" inputMode="numeric" placeholder="ISBN, e.g. 9780064400558" aria-label="ISBN" value={manualIsbn} onChange={(event) => setManualIsbn(event.target.value)} /><button type="submit">Look up</button></div>
        </form> : <p>{message || (scanMode === "isbn" ? "Hold steady · Barcodes scan automatically" : "Keep the title and author inside the frame, then tap the shutter")}</p>}
        {camera === "unavailable" && message && <p className="camera-message" role="status">{message}</p>}
      </div>
      <div className="camera-controls">
        <div className="scan-tray">
          <div className="tray-covers"><i>W</i><i>G</i>{scanned > 2 && <i>C</i>}</div>
          <button onClick={onCompare}><span><strong>{scanned} books</strong><small>Comparison tray</small></span><Icon name="chevron" /></button>
        </div>
        <div className="shutter-row"><button className="mini-camera-action" aria-label="Toggle light" disabled><Icon name="sparkle" /></button><button className="shutter" onClick={capture} disabled={busy} aria-label={scanMode === "isbn" ? "Capture barcode" : "Capture book cover"}><span /></button><button className="mini-camera-action" onClick={onResults} aria-label="Open last result"><Icon name="book" /></button></div>
      </div>
    </main>
  );
}

function Compare({ onBack, onScan }: { onBack: () => void; onScan: () => void }) {
  const rows = [
    { label: "Clarity score", values: ["86", "93", "68"] },
    { label: "Best for", values: ["8–12", "7–11", "12–15"] },
    { label: "Violence", values: ["Mild", "None", "Moderate"] },
    { label: "Language", values: ["None", "None", "Mild"] },
    { label: "Mature themes", values: ["Mild", "Mild", "Strong"] },
  ];
  return (
    <main className="screen compare-screen">
      <Header title="Compare Books" onBack={onBack} />
      <div className="compare-scroll">
        <div className="compare-intro"><span className="eyebrow">SIDE BY SIDE</span><h1>Which story fits?</h1><p>Compared using Jamie’s current sensitivity settings.</p></div>
        <div className="compare-books">
          <div><span className="compare-cover c-one">CW</span><strong>Charlotte’s Web</strong><small>E. B. White</small></div>
          <div><span className="compare-cover c-two">WR</span><strong>The Wild Robot</strong><small>Peter Brown</small></div>
          <div><span className="compare-cover c-three">TG</span><strong>The Giver</strong><small>Lois Lowry</small></div>
        </div>
        <div className="comparison-table">
          {rows.map((row) => <div className="comparison-row" key={row.label}><span>{row.label}</span><div>{row.values.map((value, index) => <strong className={value === "None" || value === "93" ? "best" : ""} key={`${value}-${index}`}>{value}</strong>)}</div></div>)}
        </div>
        <div className="comparison-pick"><Icon name="sparkle" /><p><strong>Closest match: The Wild Robot</strong>It has the fewest enabled flags for Jamie’s profile.</p></div>
        <button className="add-compare" onClick={onScan}><span>+</span>Add another book</button>
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [newProfile, setNewProfile] = useState(false);
  const [contactContext, setContactContext] = useState<"review" | "general">("general");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [returnScreen, setReturnScreen] = useState<Screen>("home");

  // query: an ISBN or "title author". No query runs the built-in sample result.
  const startBookAnalysis = (query?: string) => {
    setPendingQuery(query ?? null);
    setLookupError(null);
    setReturnScreen(screen === "bookstore" ? "bookstore" : "home");
    try {
      const isAuthenticated = window.localStorage.getItem("pageclarity-authenticated") === "true";
      const profiles = JSON.parse(window.localStorage.getItem("pageclarity-profiles") || "[]");
      const active = window.localStorage.getItem("pageclarity-active-profile");
      setScreen(!isAuthenticated || active === "0" || profiles.length === 0 ? "guestSetup" : "loading");
    } catch {
      setScreen("guestSetup");
    }
  };

  const signOut = () => {
    window.localStorage.removeItem("pageclarity-authenticated");
    window.localStorage.setItem("pageclarity-active-profile", "0");
    window.sessionStorage.removeItem("pageclarity-guest-context");
    setScreen("home");
  };

  useEffect(() => {
    if (screen !== "loading") return;
    if (!pendingQuery) {
      setBook(null);
      setAnalysis(null);
      setLoadingStep(1);
      const timer = window.setTimeout(() => setScreen("results"), 2200);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    (async () => {
      setLoadingStep(0);
      setAnalysisError(null);
      let found: Book | null = null;
      try {
        found = await lookupBook(pendingQuery);
      } catch {
        if (!cancelled) setLookupError("The book catalog isn’t reachable. Check your connection and try again.");
        return;
      }
      if (cancelled) return;
      if (!found) { setLookupError(`No book matched “${pendingQuery}”. Check the spelling or try the ISBN.`); return; }
      setBook(found);
      setAnalysis(null);
      setLoadingStep(1);
      try {
        const result = await analyzeBook(found);
        if (!cancelled) setAnalysis(result);
      } catch (error) {
        if (!cancelled) setAnalysisError(error instanceof Error ? error.message : "The analysis service isn’t reachable right now.");
      }
      if (!cancelled) setScreen("results");
    })();
    return () => { cancelled = true; };
  }, [screen, pendingQuery]);

  const retryAnalysis = () => {
    if (!book) return;
    setPendingQuery(book.isbn || `${book.title} ${book.authors.join(" ")}`);
    setScreen("loading");
  };

  useEffect(() => {
    try {
      const prefs: AccessibilityPrefs = JSON.parse(window.localStorage.getItem("pageclarity-accessibility") || "{}");
      const root = document.documentElement;
      root.classList.toggle("large-text", Boolean(prefs.largeText));
      root.classList.toggle("reduced-motion", Boolean(prefs.reducedMotion));
      root.classList.toggle("high-contrast", Boolean(prefs.highContrast));
      root.classList.toggle("screen-reader-detail", Boolean(prefs.screenReader));
    } catch {
      // Keep platform defaults if stored accessibility preferences are invalid.
    }
  }, []);

  return (
    <div className="app-shell">
      <div className="phone">
        {screen === "home" && <><Home onSearch={startBookAnalysis} onProfile={() => setScreen("settings")} onBookstore={() => setScreen("bookstore")} onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} /><TabBar active="home" navigate={setScreen} /></>}
        {screen === "guestSetup" && <GuestSetup onBack={() => setScreen("home")} onContinue={() => setScreen("loading")} />}
        {screen === "loading" && <Loading step={loadingStep} error={lookupError} onBack={() => { setLookupError(null); setScreen(returnScreen); }} />}
        {screen === "results" && <Results book={book} analysis={analysis} analysisError={analysisError} onRetry={retryAnalysis} onBack={() => setScreen("home")} onScan={() => setScreen("bookstore")} onCompare={() => setScreen("compare")} onFlag={() => { setContactContext("review"); setScreen("contact"); }} />}
        {screen === "history" && <History navigate={setScreen} />}
        {screen === "settings" && <SettingsOverview navigate={setScreen} addProfile={() => { setNewProfile(true); setScreen("profile"); }} editProfile={() => { setNewProfile(false); setScreen("profile"); }} onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} onSignOut={signOut} />}
        {screen === "profile" && <ProfileEditor navigate={setScreen} isNew={newProfile} />}
        {screen === "accessibility" && <AccessibilitySettings onBack={() => setScreen("settings")} />}
        {screen === "privacy" && <PrivacySettings onBack={() => setScreen("settings")} onManageProfiles={() => setScreen("settings")} onAccountDeleted={() => setScreen("home")} onContact={() => { setContactContext("general"); setScreen("contact"); }} onPolicy={() => setScreen("privacyPolicy")} />}
        {screen === "privacyPolicy" && <PrivacyPolicy onBack={() => setScreen("privacy")} />}
        {screen === "sources" && <SourcesMethodology onBack={() => setScreen("settings")} onFlag={() => { setContactContext("review"); setScreen("contact"); }} />}
        {screen === "contact" && <ContactPage context={contactContext} onBack={() => setScreen(contactContext === "review" ? "sources" : "privacy")} />}
        {screen === "login" && <AuthScreen mode="login" onBack={() => setScreen("settings")} onSwitch={() => setScreen("signup")} onComplete={() => setScreen("settings")} />}
        {screen === "signup" && <AuthScreen mode="signup" onBack={() => setScreen("settings")} onSwitch={() => setScreen("login")} onComplete={() => setScreen("settings")} />}
        {screen === "bookstore" && <BookstoreMode onBack={() => setScreen("home")} onResults={() => (book ? setScreen("results") : startBookAnalysis())} onCompare={() => setScreen("compare")} onFound={startBookAnalysis} />}
        {screen === "compare" && <Compare onBack={() => setScreen("results")} onScan={() => setScreen("bookstore")} />}
      </div>
    </div>
  );
}
