import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Plus, FolderOpen, Search, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const projects = useLiveQuery(
    () => db.projects.orderBy("lastModified").reverse().toArray(),
    [],
  );

  const createNewProject = async () => {
    const id = crypto.randomUUID();
    await db.projects.add({
      id,
      name: "Untitled Diagram",
      thumbnail: null,
      lastModified: Date.now(),
      createdAt: Date.now(),
      objectCount: 0,
      isFavorite: false,
      data: {
        nodes: [],
        edges: [],
      },
    });
    navigate({ to: "/editor/$projectId", params: { projectId: id } });
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      await db.projects.delete(id);
    }
  };

  const filteredProjects =
    projects?.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-background/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Flux</span>
        </div>

        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-muted/50 border border-border/50 rounded-full pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Flux"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Recent Projects</h1>
          <button
            onClick={createNewProject}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {projects === undefined ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-pulse rounded-full bg-primary/40" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-muted/20">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No projects found</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create a new project to get started
            </p>
            <button
              onClick={createNewProject}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() =>
                  navigate({
                    to: "/editor/$projectId",
                    params: { projectId: p.id },
                  })
                }
                className="group flex flex-col bg-card border border-border/50 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="aspect-video bg-muted/30 border-b border-border/50 relative overflow-hidden flex items-center justify-center">
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground/30 font-medium">
                      No Thumbnail
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 flex flex-col gap-1 relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base truncate pr-8">
                      {p.name}
                    </h3>
                    <button
                      onClick={(e) => deleteProject(p.id, e)}
                      className="absolute right-4 top-4 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(p.lastModified, { addSuffix: true })}
                    </span>
                    <span>•</span>
                    <span>{p.objectCount} objects</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
