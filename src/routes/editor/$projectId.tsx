import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Editor } from "@/features/editor/Editor";
import { useEditor } from "@/features/editor/store";

export const Route = createFileRoute("/editor/$projectId")({
  component: EditorRoute,
});

function EditorRoute() {
  const { projectId } = Route.useParams();
  const [mounted, setMounted] = useState(false);
  const loadProject = useEditor((s) => s.loadProject);

  useEffect(() => {
    let active = true;
    loadProject(projectId).then(() => {
      if (active) setMounted(true);
    });
    return () => {
      active = false;
    };
  }, [projectId, loadProject]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/40" />
      </div>
    );
  }
  return <Editor />;
}
