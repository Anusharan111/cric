import React, { useEffect, useRef } from "react";
import { ArrowRight, Trophy, Crosshair, Users, Swords } from "lucide-react";
import "./LandingPage.css";

interface LandingPageProps {
  onSelectBattle: () => void;
  onSelectFeud?: () => void;
  onSelectGuessWho?: () => void;
  onSelectParty?: () => void;
  onSelectCricketGuessWho?: () => void;
  onSelectCricketParty?: () => void;
  onOpenAbout?: () => void;
}

const COUNTRIES_LIST = [
  "NEPAL",
  "INDIA",
  "AUSTRALIA",
  "ENGLAND",
  "PAKISTAN",
  "SRI LANKA",
  "NEW ZEALAND",
  "SOUTH AFRICA",
  "BANGLADESH",
  "AFGHANISTAN",
  "WEST INDIES",
  "IRELAND"
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectBattle,
  onSelectFeud,
  onSelectGuessWho,
  onSelectParty,
  onSelectCricketGuessWho,
  onSelectCricketParty,
  onOpenAbout,
}) => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse spotlight tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        spotlightRef.current.style.left = `${e.clientX}px`;
        spotlightRef.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // IntersectionObserver for scroll reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.12 }
    );

    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach((el) => observer.observe(el));

    return () => {
      reveals.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // 3D Card tilt effect
  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = (y / rect.height - 0.5) * -8;
    const rotateY = (x / rect.width - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  };

  // Populate floodlight bulb grids (16 bulbs each)
  useEffect(() => {
    const grids = document.querySelectorAll(".floodlight .grid");
    grids.forEach((grid) => {
      if (grid.children.length === 0) {
        for (let i = 0; i < 16; i++) {
          const bulb = document.createElement("span");
          bulb.className = "bulb";
          grid.appendChild(bulb);
        }
      }
    });
  }, []);

  // Initialize subtle animated grass field
  useEffect(() => {
    const grass = document.getElementById("grass");
    if (!grass) return;

    const colors = [
      ["#164d20", "#2f7f32", "#62b84e"],
      ["#1c5e27", "#3d8f39", "#72c65b"],
      ["#205f26", "#35843a", "#5ead4c"],
      ["#123f1c", "#286f2d", "#4f9f45"],
      ["#276c29", "#4a9842", "#7acb60"]
    ];

    const BLADE_COUNT = 300; // more density, same height

    for (let i = 0; i < BLADE_COUNT; i++) {
      const blade = document.createElement("div");
      blade.className = "blade";

      const [dark, green, light] = colors[Math.floor(Math.random() * colors.length)];

      const height = 20 + Math.random() * 60; // same height range
      const width = 1 + Math.random() * 3; // thinner

      const start = -12 + Math.random() * 8;
      const middle = -3 + Math.random() * 6;
      const end = 5 + Math.random() * 12;

      blade.style.left = Math.random() * 100 + "%";

      blade.style.setProperty("--height", height + "px");
      blade.style.setProperty("--width", width + "px");
      blade.style.setProperty("--dark", dark);
      blade.style.setProperty("--green", green);
      blade.style.setProperty("--light", light);
      blade.style.setProperty("--speed", 3 + Math.random() * 2 + "s");
      blade.style.setProperty("--delay", -Math.random() * 5 + "s");
      blade.style.setProperty("--start", start + "deg");
      blade.style.setProperty("--middle", middle + "deg");
      blade.style.setProperty("--end", end + "deg");
      blade.style.setProperty("--blur", "0px");

      grass.appendChild(blade);
    }
  }, []);

  const handleFeudClick = onSelectFeud ?? onSelectCricketParty;
  const handleGuessWhoClick = onSelectGuessWho ?? onSelectCricketGuessWho;
  const handlePartyClick = onSelectParty ?? onSelectCricketParty;

  return (
    <div className="landing-app" ref={containerRef}>
      {/* Mouse spotlight */}
      <div className="spotlight" ref={spotlightRef} />

      {/* Live Ticker - only on landing page */}
      <div className="ticker">
        <div className="landing-container ticker-track">
          <span><strong>LIVE //</strong> BUILD YOUR DREAM XI</span>
          <span><strong>507 PLAYERS //</strong> 18 NATIONS</span>
          <span><strong>MULTIPLAYER //</strong> BATTLE YOUR FRIENDS</span>
          <span><strong>TACTICAL ROLES //</strong> C • VC • WK</span>
          <span><strong>LIVE //</strong> BUILD YOUR DREAM XI</span>
          <span><strong>507 PLAYERS //</strong> 18 NATIONS</span>
          <span><strong>MULTIPLAYER //</strong> BATTLE YOUR FRIENDS</span>
          <span><strong>TACTICAL ROLES //</strong> C • VC • WK</span>
        </div>
      </div>

      <main>
        {/* Hero Section - full width bg, constrained content */}
        <section className="hero">
          {/* Floodlights */}
          <button className="floodlight" aria-label="Toggle left floodlight" onClick={(e) => { e.currentTarget.classList.toggle("on"); e.stopPropagation(); }}>
            <span className="lamp">
              <span className="grid" />
            </span>
            <span className="arm" />
            <span className="pole" />
            <span className="base" />
          </button>
          <button className="floodlight right" aria-label="Toggle right floodlight" onClick={(e) => { e.currentTarget.classList.toggle("on"); e.stopPropagation(); }}>
            <span className="lamp">
              <span className="grid" />
            </span>
            <span className="arm" />
            <span className="pole" />
            <span className="base" />
          </button>

          {/* Subtle Animated Grass - thin, not blocking buttons */}
          <div className="grass" id="grass" />

          <div className="light left" />
          <div className="light right" />
          <div className="pitch" />

          <div className="particles">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="ball" />

          <div className="landing-container hero-content">
            <div className="eyebrow">◉ LIVE INTERNATIONAL ARENA</div>

            <h1>
              <div className="hero-line">
                <div>BUILD YOUR</div>
              </div>
              <div className="hero-line">
                <div>
                  <span>DREAM XI.</span>
                </div>
              </div>
            </h1>

            <p className="hero-description">
              Draft legendary players, assign tactical roles, discover synergies,
              and build a cricket team capable of dominating the arena.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="landing-button primary"
                onClick={onSelectBattle}
              >
                ⚔ ENTER THE ARENA <ArrowRight className="w-4 h-4" />
              </button>

              <a href="#modes" className="landing-button secondary">
                EXPLORE MODES ↓
              </a>
            </div>

            <div className="stats">
              <div className="stat">
                <strong>507+</strong> PLAYERS
              </div>
              <div className="stat">
                <strong>18</strong> NATIONS
              </div>
              <div className="stat">● MULTIPLAYER ARENA</div>
            </div>
          </div>
        </section>

        {/* Game Modes Section - full width bg, constrained content */}
        <section className="modes" id="modes">
          <div className="landing-container">
            <div className="section-title">
              <span>SELECT YOUR GAME</span>
            </div>
          </div>

          {/* Featured Game Mode - Cricket Battle */}
          <article id="arena" className="featured-mode reveal" onClick={onSelectBattle}>
            <div className="featured-bg">
              <div className="featured-glow" />
            </div>
            <div className="featured-content">
              <div className="featured-badge">
                <span className="badge-icon">⚔</span>
                <span>FEATURED GAME MODE</span>
                <span className="badge-number">01</span>
              </div>
              <h2 className="featured-title">
                CRICKET<br />BATTLE
              </h2>
              <p className="featured-desc">
                Draft your squad. Assign tactical roles (C, VC, WK). Counter your opponent
                and discover the strongest possible combination of players.
              </p>
              <div className="featured-stats">
                <div className="stat-item">
                  <div className="stat-header">
                    <span className="stat-label">POWER</span>
                    <span className="stat-value">92</span>
                  </div>
                  <div className="stat-bar"><i style={{ width: "92%" }} /></div>
                </div>
                <div className="stat-item">
                  <div className="stat-header">
                    <span className="stat-label">STRATEGY</span>
                    <span className="stat-value">88</span>
                  </div>
                  <div className="stat-bar"><i style={{ width: "88%" }} /></div>
                </div>
                <div className="stat-item">
                  <div className="stat-header">
                    <span className="stat-label">SYNERGY</span>
                    <span className="stat-value">95</span>
                  </div>
                  <div className="stat-bar"><i style={{ width: "95%" }} /></div>
                </div>
              </div>
              <button className="featured-cta" onClick={onSelectBattle}>
                <span>ENTER BATTLE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>

          {/* Secondary Game Modes Grid */}
          <div className="modes-grid">
            <article className="mode-card trivia reveal" onClick={handleFeudClick} onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="mode-header">
                <span className="mode-num">02</span>
                <div className="mode-icon-wrap red">
                  <Trophy className="w-7 h-7" />
                </div>
              </div>
              <h3 className="mode-title">TRIVIA CLASH</h3>
              <p className="mode-desc">Test your cricket knowledge, steal points, and defeat your friends in fast-paced rounds.</p>
              <button className="mode-cta red" onClick={handleFeudClick}>
                PLAY FEUD <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article className="mode-card guess reveal" onClick={handleGuessWhoClick} onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="mode-header">
                <span className="mode-num">03</span>
                <div className="mode-icon-wrap blue">
                  <Crosshair className="w-7 h-7" />
                </div>
              </div>
              <h3 className="mode-title">GUESS WHO</h3>
              <p className="mode-desc">Ask questions, eliminate players, and identify the mystery cricketer before your rival does.</p>
              <button className="mode-cta blue" onClick={handleGuessWhoClick}>
                START SEARCH <ArrowRight className="w-4 h-4" />
              </button>
            </article>

            <article className="mode-card party reveal" onClick={handlePartyClick} onMouseMove={handleCardMouseMove} onMouseLeave={handleCardMouseLeave}>
              <div className="mode-header">
                <span className="mode-num">04</span>
                <div className="mode-icon-wrap green">
                  <Users className="w-7 h-7" />
                </div>
              </div>
              <h3 className="mode-title">PARTY GAMES</h3>
              <p className="mode-desc">Quick cricket games designed for friends, groups, and chaotic match nights.</p>
              <button className="mode-cta green" onClick={handlePartyClick}>
                OPEN PARTY <ArrowRight className="w-4 h-4" />
              </button>
            </article>
          </div>

          {/* Database Section */}
          <section id="players" className="database reveal">
              <div>
                <div className="arena-label">GLOBAL PLAYER DATABASE</div>
                <h2>
                  ONE GLOBAL<br />
                  ROSTER.
                </h2>
                <p style={{ color: "var(--muted)" }}>
                  Build teams using players from Nepal and international cricket.
                </p>
              </div>

              <div className="countries">
                {COUNTRIES_LIST.map((country) => (
                  <div key={country} className="country">
                    {country}
                  </div>
                ))}
              </div>
            </section>
        </section>
      </main>

      {/* Footer - full width bg, constrained content */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div>© 2026 CRICKET BATTLE</div>
          <div>ALL PLAYERS. ONE PITCH.</div>
          <div style={{ color: "var(--gold)" }}>
            BUILD • DRAFT • DOMINATE
          </div>
          {onOpenAbout && (
            <button type="button" onClick={onOpenAbout}>
              ABOUT <ArrowRight className="w-3 h-3 inline-block" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
