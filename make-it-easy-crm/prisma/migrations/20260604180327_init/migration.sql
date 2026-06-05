-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "valorEstimado" REAL NOT NULL DEFAULT 0,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "sector" TEXT,
    "numEmpleados" TEXT,
    "procesoAAutomatizar" TEXT,
    "planInteres" TEXT
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "tamano" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empresaNombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "telefono2" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email2" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    CONSTRAINT "contactos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interacciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interacciones_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vendedor" TEXT NOT NULL DEFAULT 'Daniel Rangel',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "empresaNombre" TEXT NOT NULL,
    "contactoNombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "tituloPropuesta" TEXT NOT NULL DEFAULT 'Propuesta Comercial: Ecosistema Digital Omnicanal',
    "desafioNegocio" TEXT,
    "prerrequisitos" TEXT,
    "arquitecturaJson" TEXT,
    "fasesJson" TEXT,
    "checklistInicio" TEXT,
    "totalProyectoCore" REAL NOT NULL DEFAULT 0,
    "moduloOpcionalFee" REAL NOT NULL DEFAULT 0,
    "feeMensual" REAL NOT NULL DEFAULT 0,
    "feeMensualIncluye" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "observaciones" TEXT,
    "validez" TEXT NOT NULL DEFAULT '30 días',
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    CONSTRAINT "cotizaciones_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "cotizacionId" TEXT,
    "titulo" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntregaEstimada" DATETIME,
    "notas" TEXT NOT NULL,
    "herramientasUsadas" TEXT,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    CONSTRAINT "proyectos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "proyectos_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "automation_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ejecuciones24h" INTEGER NOT NULL DEFAULT 0,
    "tasaExito" REAL NOT NULL DEFAULT 100.0,
    "tiempoPromedio" REAL NOT NULL DEFAULT 0.0,
    "notas" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    CONSTRAINT "automation_flows_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ventas',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referencia" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "costoEstimado" REAL NOT NULL,
    "precioSugerido" REAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'servicio',
    "descripcion" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_fechaCreacion_idx" ON "leads"("fechaCreacion");

-- CreateIndex
CREATE INDEX "contactos_empresaId_idx" ON "contactos"("empresaId");

-- CreateIndex
CREATE INDEX "interacciones_contactoId_idx" ON "interacciones"("contactoId");

-- CreateIndex
CREATE INDEX "cotizaciones_leadId_idx" ON "cotizaciones"("leadId");

-- CreateIndex
CREATE INDEX "cotizaciones_fechaCreacion_idx" ON "cotizaciones"("fechaCreacion");

-- CreateIndex
CREATE INDEX "proyectos_leadId_idx" ON "proyectos"("leadId");

-- CreateIndex
CREATE INDEX "proyectos_cotizacionId_idx" ON "proyectos"("cotizacionId");

-- CreateIndex
CREATE INDEX "automation_flows_proyectoId_idx" ON "automation_flows"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_referencia_key" ON "productos"("referencia");
