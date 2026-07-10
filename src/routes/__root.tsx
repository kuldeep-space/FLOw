import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

import appCss from "../styles.css?url";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Portexa | Free Online Flowchart & Diagram Maker" },
        { name: "description", content: "Design and create a free flow chart without signup instantly. Portexa is the ultimate free online flowchart maker, diagramming tool, and whiteboard for teams. Built by Kuldeep Jangid (kuldeep.space), it's the perfect free alternative to draw.io, Visio, and Lucidchart for mapping workflows, architectures, and mind maps with zero registration required." },
        { name: "keywords", content: "free flow chart without signup, create flowcharts online without login, free flowchart maker, best online diagram tool, flowchart software free, create free flow chart no signup, mind map maker free, network diagrams tool, workflow diagram maker, free drawing tool no login, whiteboard online free no registration, diagram generator, software architecture diagram tool, ER diagram maker free, UML diagram creator without signup, sequence diagram tool, data flow diagram free, business process modeling tool, free organizational chart maker, flowchart templates free, diagram software no signup, best free visio alternative, free lucidchart alternative, draw.io alternative free, miro alternative for flowcharts, whimsical alternative free, gliffy alternative online, creately alternative free, edrawmax alternative, canva flowchart alternative, figma figjam alternative free, excalidraw alternative online, smartdraw alternative free, coggle alternative, mindmeister free alternative, mural alternative flowchart, visme alternative, omnigraffle alternative free, Portexa flowchart, portexa diagram tool, online whiteboard for teams free, wireframe tool free, ui ux mockup tool no login, conceptual diagram maker, visual workspace free, system design diagram tool, database schema generator, flowchart symbols, process mapping software free, fast flowchart tool, flowchart online free no watermark, best flowchart software, flowchart creator, digital whiteboard free no signup, open source flowchart tool, browser based flowchart maker, kuldeep jangid, kuldeep space, kuldeep.space, kuldeep jangid portfolio, developer kuldeep, kuldeep jangid projects" },
        { name: "keywords", content: "figma, figma alternative, figma online, free figma alternative, figma wireframe, figma diagram tool, figma figjam free, figma design tool alternative, use figma free, figma for flowchart, figma flowchart maker, figma whiteboard alternative, online figma editor" },
        { name: "keywords", content: "balsamiq alternative, mockplus alternative, axure free alternative, sketch flowchart, invision alternative free, adobe xd wireframe alternative, moqups free alternative, uxpin alternative, plantuml alternative online, mermaid.js editor free, structurizr alternative, cloudcraft alternative free, eraser.io alternative, xmind free alternative, mindmanager alternative, freemind online, ayoa alternative, simplemind free alternative, milanote alternative free, notion flowchart integration, obsidian canvas alternative, trello flowchart maker, asana plan maker, conceptdraw alternative, dia diagram editor free, pencil project alternative, yed graph editor online, graphviz online free, terrastruct alternative, gleek alternative, cacoo alternative free, boardmix alternative, edrawmind alternative, app plan maker free, free wireframing tool online, ui mockup tool free, agile planner tool, mind mapping software free, system architecture diagram tool, aws diagram tool free, azure architecture diagram free, gcp diagram maker, flowchart for developers, code to flowchart generator" },
        { name: "author", content: "Kuldeep Jangid (kuldeep.space)" },
        { property: "og:title", content: "Portexa | Free Online Flowchart Maker" },
        { property: "og:description", content: "Create beautiful flowcharts and diagrams for free with Portexa. No signup required." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@Portexa" },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "icon", href: "/favicon.svg" },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <Analytics />
      </body>
    </html>
  );
}

import { TooltipProvider } from "@/components/ui/tooltip";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
