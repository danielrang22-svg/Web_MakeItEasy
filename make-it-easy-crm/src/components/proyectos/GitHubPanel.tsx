import { useEffect, useState } from "react";
import { Github, GitPullRequest, GitBranch, GitCommit, ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface GitHubPanelProps {
  githubRepo: string | null;
}

export default function GitHubPanel({ githubRepo }: GitHubPanelProps) {
  const [activeTab, setActiveTab] = useState<"prs" | "branches" | "commits">("prs");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!githubRepo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?repo=${githubRepo}&type=${activeTab}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error fetching GitHub");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [githubRepo, activeTab]);

  if (!githubRepo) {
    return (
      <div className="p-8 text-center bg-card ring-1 ring-border rounded-2xl border-dashed">
        <Github size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="font-bold text-foreground">Repositorio no vinculado</p>
        <p className="text-xs text-muted-foreground mt-1">Configura el repositorio de GitHub en los detalles del proyecto para ver PRs y ramas.</p>
      </div>
    );
  }

  return (
    <div className="bg-card ring-1 ring-border rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <Github size={18} />
          <h3 className="font-bold text-sm">{githubRepo}</h3>
          <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-mie-primary">
            <ExternalLink size={12}/>
          </a>
        </div>
        <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Refrescar">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex px-2 pt-2 border-b border-border bg-muted/10 gap-2">
        <button 
          onClick={() => setActiveTab("prs")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === "prs" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <GitPullRequest size={14}/> Pull Requests
        </button>
        <button 
          onClick={() => setActiveTab("branches")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === "branches" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <GitBranch size={14}/> Ramas
        </button>
        <button 
          onClick={() => setActiveTab("commits")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activeTab === "commits" ? "border-mie-primary text-mie-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <GitCommit size={14}/> Commits
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : error ? (
          <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg text-center">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            No se encontraron {activeTab}
          </div>
        ) : (
          <div className="space-y-2">
            {activeTab === "prs" && data.map((pr: any) => (
              <a key={pr.id} href={pr.html_url} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border transition-colors group">
                <GitPullRequest size={16} className={pr.state === "open" ? "text-green-500" : pr.merged_at ? "text-purple-500" : "text-red-500"} />
                <div>
                  <p className="text-xs font-bold text-foreground group-hover:text-mie-primary transition-colors line-clamp-1">{pr.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">#{pr.number} by {pr.user?.login} • {pr.state}</p>
                </div>
              </a>
            ))}

            {activeTab === "branches" && data.map((branch: any) => (
              <div key={branch.name} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                <GitBranch size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-foreground">{branch.name}</p>
                </div>
              </div>
            ))}

            {activeTab === "commits" && data.map((commit: any) => (
              <a key={commit.sha} href={commit.html_url} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-xl border border-border transition-colors group">
                <div className="w-6 h-6 rounded-full bg-mie-primary/10 flex items-center justify-center flex-shrink-0">
                  <GitCommit size={12} className="text-mie-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{commit.commit?.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{commit.sha.substring(0,7)} by {commit.commit?.author?.name} • {new Date(commit.commit?.author?.date).toLocaleDateString()}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
