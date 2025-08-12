# Script de inicializacion de la base de datos SQLite
# Crea la base de datos y ejecuta el esquema

# Configuracion
$databaseDir = "$PSScriptRoot\..\database"
$dbFile = "$databaseDir\mr_robot_commerce.db"
$schemaFile = "$PSScriptRoot\..\database\schema-sqlite.sql"

# Verificar si existe el directorio de la base de datos
if (-not (Test-Path -Path $databaseDir)) {
    New-Item -ItemType Directory -Path $databaseDir | Out-Null
    Write-Host "Directorio de base de datos creado en: $databaseDir"
}

# Verificar si el archivo de base de datos ya existe
if (Test-Path -Path $dbFile) {
    Write-Host "La base de datos ya existe en: $dbFile"
    exit 0
}

# Crear la base de datos vacia
"" | Out-File -FilePath $dbFile -Encoding ascii
Write-Host "Base de datos SQLite creada en: $dbFile"

# Instalar modulo SQLite si es necesario
if (-not (Get-Module -ListAvailable -Name PSSQLite)) {
    try {
        Install-Module -Name PSSQLite -Force -Scope CurrentUser -ErrorAction Stop
        Import-Module PSSQLite -Force
    } catch {
        Write-Error "No se pudo instalar el modulo PSSQLite. Por favor instala SQLite manualmente."
        exit 1
    }
}

# Verificar si el archivo de esquema existe
if (-not (Test-Path -Path $schemaFile)) {
    Write-Error "No se encontro el archivo de esquema: $schemaFile"
    exit 1
}

# Ejecutar el script SQL
Write-Host "Ejecutando script de esquema..."
$connection = New-SQLiteConnection -DataSource $dbFile
$query = Get-Content -Path $schemaFile -Raw

# Dividir el script en comandos SQL individuales
$commands = $query -split ";" | Where-Object { $_.Trim() -ne "" }

foreach ($cmd in $commands) {
    try {
        Invoke-SqliteQuery -SQLiteConnection $connection -Query $cmd | Out-Null
    } catch {
        Write-Warning "Error al ejecutar comando: $cmd"
        Write-Warning $_.Exception.Message
    }
}

$connection.Close()
Write-Host "Base de datos inicializada exitosamente!"
