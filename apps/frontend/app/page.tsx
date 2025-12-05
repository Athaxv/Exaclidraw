import Link from "next/link";
import { Button } from "@/components/ui/button";

const featureHighlights = [
  {
    title: "Live collaboration",
    description:
      "Spin up a shared canvas in seconds and invite teammates with a single link.",
  },
  {
    title: "Local-first data",
    description:
      "Your strokes persist in the browser, keeping drafts fast, responsive, and private.",
  },
  {
    title: "Room privacy controls",
    description:
      "Secure rooms with access tokens so only invited collaborators can join.",
  },
  {
    title: "Keyboard-first workflow",
    description:
      "Switch tools, duplicate elements, and navigate canvases without lifting your hands.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background"
        aria-hidden="true"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-24 sm:px-8 sm:py-32">
        <section className="text-center">
          <p className="mx-auto mb-4 inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ExcaliDraw preview
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Sketch ideas. Share progress. Build together.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A multiplayer-first drawing surface that pairs Excalidraw-like speed
            with real-time rooms, chat, and session controls.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/demo">Launch the live demo</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/canvas/demo">Join the shared canvas</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {featureHighlights.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-border/60 bg-card/60 p-5 text-left backdrop-blur"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
