import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return NextResponse.json({ error: "No se configuró GITHUB_TOKEN en el servidor." }, { status: 500 });
        }

        const body = await req.json();
        const { nombre, descripcion, privado = true } = body;

        if (!nombre) {
            return NextResponse.json({ error: "Falta el nombre del repositorio" }, { status: 400 });
        }

        // 1. Crear el repositorio en GitHub
        const createRepoRes = await fetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: nombre,
                description: descripcion || "Proyecto generado automáticamente por Make It Easy CRM",
                private: privado,
                auto_init: true // To initialize with a README
            })
        });

        if (!createRepoRes.ok) {
            const errBody = await createRepoRes.json();
            return NextResponse.json({ error: "Error al crear repositorio en GitHub", details: errBody }, { status: createRepoRes.status });
        }

        const repoData = await createRepoRes.json();
        const full_name = repoData.full_name; // e.g. "user/repo-name"
        const owner = repoData.owner.login;
        const repo = repoData.name;

        // 2. Intentar configurar el Webhook
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tusistema.com";
        const webhookUrl = `${appUrl}/api/github/webhook`;

        // If appUrl is localhost and not a tunnel, GitHub won't be able to reach it,
        // but we'll create the hook anyway so it's ready when deployed.
        const createHookRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
            method: "POST",
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "web",
                active: true,
                events: ["pull_request"],
                config: {
                    url: webhookUrl,
                    content_type: "json",
                    insecure_ssl: "0"
                }
            })
        });

        let webhookSuccess = true;
        let webhookError = null;

        if (!createHookRes.ok) {
            webhookSuccess = false;
            webhookError = await createHookRes.json();
            console.error("No se pudo configurar el webhook automáticamente:", webhookError);
        }

        return NextResponse.json({
            success: true,
            full_name: full_name,
            html_url: repoData.html_url,
            webhook_configured: webhookSuccess,
            webhook_error: webhookError
        });

    } catch (error: any) {
        console.error("Error en /api/github/repos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
