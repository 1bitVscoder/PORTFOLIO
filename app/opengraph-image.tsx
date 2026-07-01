import { ImageResponse } from "next/og";
import siteMetadata from "@/data/site-metadata.json";
import designTokens from "@/data/design-tokens.json";

export const dynamic = "force-static";
export const alt = siteMetadata.openGraph.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ogBackground = designTokens.colors.ogBackground;
const textColor = designTokens.colors.text.primary;
const accentColor = designTokens.colors.accent.teal;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: ogBackground,
          color: textColor,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: accentColor,
          }}
        >
          ZENITH SOUMYA · DEVELOPER
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              display: "flex",
            }}
          >
            ZENITH
          </div>
          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              display: "flex",
              alignSelf: "flex-end",
            }}
          >
            SOU<span style={{ color: accentColor }}>M</span>YA
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "rgba(27,32,40,0.6)",
            fontFamily: "system-ui, serif",
          }}
        >
          <span>IoT · AI · Full-Stack</span>
          <span>Portfolio · 2026</span>
        </div>
      </div>
    ),
    size,
  );
}
