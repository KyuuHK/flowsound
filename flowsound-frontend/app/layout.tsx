import type { Metadata } from "next";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const sfProRounded = localFont({
  src: [
    {
      path: "../fonts/SF-Pro-Rounded-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/SF-Pro-Rounded-Heavy.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-sf",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowSound — Aura",
  description: "Open Lo-Fi ambient playback with a Pomodoro focus engine.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
<html lang="en" className={`${sfProRounded.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {/* Direction contract — emitted as a real HTML comment so it survives the
            production build and stays grep-able in the shipped markup. */}
        <span
          aria-hidden="true"
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
          FlowSound — Direction contract
          THESIS: a paper instrument deck on a chalk-cream page — playback and focus
          (and future tasks) composed edge-to-edge on the warm cream ground, one
          category accent while playing, one Apple-red double-dot marking the focus
          clock, everything sprung and bouncy. Quiet, warm, tactile.
          OWN-WORLD: chalk cream canvas (#EFE9DC), SF Pro Rounded everywhere —
          Semibold for letters and labels, the Heavy cut solely for the focus clock —
          a red double-dot colon, red session pips, red Start/Pause pill, springs
          everywhere motion happens — press-in buttons that bounce back, a
          drum that rolls, a sliding nav thumb.
          STORY: one glance reads what is playing against warm paper; the red
          heartbeat counts focus time in bold rounded numerals; a floating segmented
          control glides between the Focus engine and the Player while music never
          stops.
          FIRST VIEWPORT: a floating segmented control (Focus / Player / Tasks) with a
          satellite theme circle at the top-left; the canvas is full-bleed —
          no card-in-a-window. Player — centered column: mood chips, tinted artwork
          seat, bold rounded title, ink transport, VU meter. Focus — SF Pro Rounded
          Heavy drum owning the optical center, time-remaining bar, red session pips,
          and a floating bottom dock (WORK/BREAK rails midline with a loud Start pill)
          that collapses while running to just Pause + hold-to-reset. Tasks — a quiet
          WIP placeholder. All panes stay mounted so audio always continues.
          MOTION: hover zooms controls in place (Springy for icons with a
          spring ease; a crisp two-tap scale for text so labels never blur),
          every press bounces back with a WAAPI spring overshoot — pure
          translate for text, scale squish for icons; the nav thumb and dock
          state swaps use Framer Motion springs (450/35, mass 0.8), flattened
          to instant under reduced motion.
          FORM: user-pinned direction, rounded everywhere, Apple-like spring motion,
          chalk cream ground; no roll — a pinned direction beats the roll, always.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the
          finish review, the verdict, DESIGN.md, and every shipping raster carrying its
          provenance.
        -->`,
          }}
        />
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}