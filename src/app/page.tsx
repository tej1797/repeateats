// Landing page — Server Component (no "use client" needed, no JS interactivity yet).
// Matches the repEAT_v3.html landing screen pixel-for-pixel.
import {
  IconMapPin,
  IconUsers,
  IconBuildingStore,
  IconDeviceMobileStar,
  IconArrowRight,
} from "@tabler/icons-react";

// ─── Portal card data ─────────────────────────────────────────────────────
// Each portal has its own colour scheme from the HTML prototype.
const PORTALS = [
  {
    href: "/customer",
    iconBg: "bg-[#FFF3EC]",                 // --blt (orange tint)
    icon: <IconUsers size={26} style={{ color: "var(--br)" }} />,
    title: "Customer",
    subtitle: "/ Foodie",
    description: "Browse deals near you, filter by city, cuisine, or deal type",
    ctaText: "Browse deals",
    ctaColor: "var(--br)",                  // orange
  },
  {
    href: "/restaurant",
    iconBg: "bg-[#ECFDF5]",                 // green tint
    icon: <IconBuildingStore size={26} style={{ color: "#065F46" }} />,
    title: "Restaurant",
    subtitle: "/ Business",
    description: "List deals, import menu from Google, track redemptions — free",
    ctaText: "List your restaurant",
    ctaColor: "#065F46",                    // dark green
  },
  {
    href: "/influencer",
    iconBg: "bg-[#FDF4FF]",                 // purple tint
    icon: <IconDeviceMobileStar size={26} style={{ color: "#7E22CE" }} />,
    title: "Creator",
    subtitle: "/ Influencer",
    description: "Find restaurant collabs, negotiate in-app, earn on every deal",
    ctaText: "Find collabs",
    ctaColor: "#7E22CE",                    // purple
  },
];

// ─── Stats row data ───────────────────────────────────────────────────────
const STATS = [
  { value: "400+", label: "Restaurants" },
  { value: "15",   label: "Ontario cities" },
  { value: "$0",   label: "Monthly fee" },
  { value: "0%",   label: "Commission" },
];

export default function LandingPage() {
  return (
    // Full-height flex column — nav at top, hero centred in the rest
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          padding: "20px 24px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Logo: "Rep" in default text colour + "EAT" in orange */}
        <div className="logo" style={{ fontSize: 34 }}>
          Rep<span className="eat">EAT</span>
        </div>

        {/* Sign in button — outlined style from HTML (.bol class) */}
        <a
          href="/customer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: "0 18px",
            borderRadius: "var(--rs)",
            border: "1.5px solid var(--bd2)",
            color: "var(--tx)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.14s",
          }}
          onMouseOver={undefined}  // hover handled by CSS if needed
        >
          Sign in
        </a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: 980, width: "100%", textAlign: "center" }}>

          {/* Ontario badge pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--blt)",
              color: "var(--br)",
              fontSize: 13,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 100,
              marginBottom: 20,
            }}
          >
            <IconMapPin size={14} />
            Ontario-wide · Starting with GTA &amp; KW
          </div>

          {/* Main headline */}
          <h1
            style={{
              // clamp() scales the font between 36 px and 66 px depending on viewport
              fontSize: "clamp(36px, 6vw, 66px)",
              fontWeight: 800,
              lineHeight: 1.08,
              marginBottom: 18,
              letterSpacing: "-2px",
            }}
          >
            Restaurant deals,
            <br />
            <span style={{ color: "var(--br)" }}>claimed in person.</span>
          </h1>

          {/* Sub-headline */}
          <p
            style={{
              fontSize: 17,
              color: "var(--t2)",
              maxWidth: 500,
              margin: "0 auto 48px",
              lineHeight: 1.7,
            }}
          >
            Discover weekly promotions from local restaurants across Ontario. No
            delivery fees, no apps — just show your QR code at the door.
          </p>

          {/* ── Three portal cards ────────────────────────────────────────── */}
          {/* auto-fit grid: each card is at least 260 px wide, expands to fill */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              textAlign: "left",
            }}
          >
            {PORTALS.map((p) => (
              <a
                key={p.href}
                href={p.href}
                style={{
                  background: "var(--sf)",
                  borderRadius: "var(--r)",
                  padding: 22,
                  cursor: "pointer",
                  border: "2px solid var(--bd)",
                  transition: "all 0.16s",
                  boxShadow: "var(--sh)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                }}
                // Inline hover not possible in JSX — Tailwind group hover handles it
                className="group hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Icon circle */}
                <div
                  className={p.iconBg}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  {p.icon}
                </div>

                {/* Title + subtitle */}
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                  {p.title}{" "}
                  <span style={{ color: "var(--t3)", fontSize: 13, fontWeight: 400 }}>
                    {p.subtitle}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--t2)",
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  {p.description}
                </div>

                {/* CTA link-style row */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.ctaColor,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {p.ctaText} <IconArrowRight size={14} />
                </div>
              </a>
            ))}
          </div>

          {/* ── Stats row ─────────────────────────────────────────────────── */}
          {/* Shows platform credibility numbers below the cards */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "clamp(24px, 5vw, 64px)",
              marginTop: 48,
              flexWrap: "wrap",
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--fh)",
                    fontSize: "clamp(22px, 4vw, 32px)",
                    fontWeight: 800,
                    color: "var(--br)",
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Ontario tagline */}
          <p
            style={{
              fontSize: 13,
              color: "var(--t3)",
              marginTop: 32,
              letterSpacing: "0.02em",
            }}
          >
            🍁 Made for Ontario restaurants · repeateats.ca
          </p>
        </div>
      </main>
    </div>
  );
}
