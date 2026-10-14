#!/usr/bin/env bash
# Despliega en este servidor el commit que el repo tenga en HEAD: construye
# la imagen, la prueba en un contenedor candidato y recién ahí reemplaza al
# que está atendiendo. Si el contenedor nuevo no responde /health, vuelve
# solo al anterior — el servicio nunca queda caído por un deploy roto.
#
# Corre como root (así lo ejecuta SSM Run Command). No hace git pull: quien
# lo invoca deja el repo en el commit a desplegar (ver deploy-remoto.sh).
#
# Los nombres/puertos se pueden sobreescribir por variable de entorno solo
# para probar el script en una máquina local sin pisar otro contenedor; en
# el servidor se usan siempre los valores por defecto.
set -euo pipefail

NOMBRE="${NOMBRE:-informes-microservicio}"
IMAGEN="${IMAGEN:-informes-microservicio}"
PUERTO="${PUERTO:-3005}"
PUERTO_CANDIDATO="${PUERTO_CANDIDATO:-3006}"
# La imagen pesa ~3.4 GB y el disco (20 GB) es compartido con la app y los
# legajos: no arrancar un build que pueda llenarlo.
ESPACIO_MINIMO_GB="${ESPACIO_MINIMO_GB:-4}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# El repo es de ssm-user y esto corre como root: sin safe.directory, git se
# niega a leerlo ("dubious ownership").
SHA="$(git -c safe.directory="$REPO_DIR" -C "$REPO_DIR" rev-parse --short HEAD)"
NUEVA="$IMAGEN:$SHA"

log() { echo "[deploy $(date '+%H:%M:%S')] $*"; }

existe() { docker container inspect "$1" >/dev/null 2>&1; }

# Mismos flags que la instalación documentada (infraestructura-microservicio-
# informes.md, sección 3) — no sacar ninguno sin saber por qué está.
correr() {
  local nombre="$1" puerto="$2" imagen="$3"
  docker run -d \
    --name "$nombre" \
    --restart unless-stopped \
    -p "127.0.0.1:$puerto:3005" \
    --shm-size=256m \
    --memory=768m \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    -e NODE_ENV=production \
    "$imagen" >/dev/null
}

esperar_salud() {
  local puerto="$1"
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$puerto/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Una corrida anterior que murió entre el rename y el run deja el servicio
# sin contenedor principal: restaurarlo antes de cualquier otra cosa.
if ! existe "$NOMBRE" && existe "$NOMBRE-anterior"; then
  log "Restaurando $NOMBRE-anterior, que quedó de una corrida interrumpida"
  docker rename "$NOMBRE-anterior" "$NOMBRE"
  docker start "$NOMBRE" >/dev/null
fi
existe "$NOMBRE-anterior" && docker rm -f "$NOMBRE-anterior" >/dev/null
existe "$NOMBRE-candidato" && docker rm -f "$NOMBRE-candidato" >/dev/null

if existe "$NOMBRE" && [ "$(docker inspect --format '{{.Config.Image}}' "$NOMBRE")" = "$NUEVA" ]; then
  log "$NUEVA ya es la versión desplegada, no hay nada que hacer"
  exit 0
fi

LIBRE_GB="$(df --output=avail -BG / | tail -1 | tr -dc '0-9')"
if [ "$LIBRE_GB" -lt "$ESPACIO_MINIMO_GB" ]; then
  log "ERROR: quedan ${LIBRE_GB} GB libres en /, se necesitan ${ESPACIO_MINIMO_GB}. No se construye nada."
  exit 1
fi

log "Construyendo $NUEVA (${LIBRE_GB} GB libres)"
docker build -q -t "$NUEVA" "$REPO_DIR" >/dev/null

log "Probando $NUEVA en un candidato en el puerto $PUERTO_CANDIDATO"
if ! correr "$NOMBRE-candidato" "$PUERTO_CANDIDATO" "$NUEVA" || ! esperar_salud "$PUERTO_CANDIDATO"; then
  log "ERROR: el candidato no respondió /health. Sus últimos logs:"
  docker logs --tail 30 "$NOMBRE-candidato" 2>&1 || true
  docker rm -f "$NOMBRE-candidato" >/dev/null 2>&1 || true
  log "Se mantiene la versión actual, sin cambios"
  exit 1
fi
docker rm -f "$NOMBRE-candidato" >/dev/null

if existe "$NOMBRE"; then
  log "Reemplazando $(docker inspect --format '{{.Config.Image}}' "$NOMBRE") por $NUEVA"
  docker stop "$NOMBRE" >/dev/null
  docker rename "$NOMBRE" "$NOMBRE-anterior"
fi

if correr "$NOMBRE" "$PUERTO" "$NUEVA" && esperar_salud "$PUERTO"; then
  existe "$NOMBRE-anterior" && docker rm "$NOMBRE-anterior" >/dev/null
  # El tag :dev sigue apuntando a lo desplegado, para que los comandos
  # manuales de la documentación sigan valiendo.
  docker tag "$NUEVA" "$IMAGEN:dev"
  log "OK: $NUEVA desplegada y respondiendo en 127.0.0.1:$PUERTO"
else
  log "ERROR: $NUEVA no respondió /health en el puerto $PUERTO. Volviendo a la versión anterior"
  docker logs --tail 30 "$NOMBRE" 2>&1 || true
  docker rm -f "$NOMBRE" >/dev/null 2>&1 || true
  if existe "$NOMBRE-anterior"; then
    docker rename "$NOMBRE-anterior" "$NOMBRE"
    docker start "$NOMBRE" >/dev/null
    esperar_salud "$PUERTO" && log "Versión anterior restaurada y respondiendo"
  fi
  exit 1
fi
