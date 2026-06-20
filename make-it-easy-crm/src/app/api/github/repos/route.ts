import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return NextResponse.json({ error: "No se configuró GITHUB_TOKEN en el servidor." }, { status: 500 });
        }

        const body = await req.json();
        const { action, fullName, nombre, descripcion, privado = true } = body;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tusistema.com";
        const webhookUrl = `${appUrl}/api/github/webhook`;

        if (action === "link") {
            if (!fullName || !fullName.includes("/")) {
                return NextResponse.json({ error: "Falta el nombre completo del repositorio o formato incorrecto (debe ser usuario/repositorio)" }, { status: 400 });
            }

            const [owner, repo] = fullName.split("/");

            // 1. Verificar la existencia del repositorio en GitHub
            const checkRepoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                method: "GET",
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            });

            if (!checkRepoRes.ok) {
                const errBody = await checkRepoRes.json().catch(() => ({}));
                return NextResponse.json({ error: "No se pudo acceder al repositorio en GitHub. Verifica que exista y tengas acceso.", details: errBody }, { status: checkRepoRes.status });
            }

            const repoData = await checkRepoRes.json();

            // 2. Crear el Webhook en el repositorio existente
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
                    events: ["pull_request", "push"],
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
                webhookError = await createHookRes.json().catch(() => ({}));
                console.error("No se pudo configurar el webhook en el repositorio vinculado:", webhookError);
                // Si el webhook ya existe (código 422 con error "Hook already exists"), podemos considerarlo éxito
                if (createHookRes.status === 422 && JSON.stringify(webhookError).includes("already exists")) {
                    webhookSuccess = true;
                    webhookError = null;
                }
            }

            return NextResponse.json({
                success: true,
                full_name: repoData.full_name,
                html_url: repoData.html_url,
                webhook_configured: webhookSuccess,
                webhook_error: webhookError
            });
        }

        // --- COMPORTAMIENTO POR DEFECTO: CREAR NUEVO REPOSIORIO ---
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
            const errBody = await createRepoRes.json().catch(() => ({}));
            return NextResponse.json({ error: "Error al crear repositorio en GitHub", details: errBody }, { status: createRepoRes.status });
        }

        const repoData = await createRepoRes.json();
        const full_name = repoData.full_name; // e.g. "user/repo-name"
        const owner = repoData.owner.login;
        const repo = repoData.name;

        // 2. Intentar configurar el Webhook
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
                events: ["pull_request", "push"],
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
            webhookError = await createHookRes.json().catch(() => ({}));
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
