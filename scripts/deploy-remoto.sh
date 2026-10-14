#!/usr/bin/env bash
# Despliega origin/main en gsc-sir-web-dev desde tu máquina, sin abrir una
# sesión SSM: le pide a SSM Run Command que haga git pull en el servidor y
# corra scripts/deploy.sh, espera a que termine y muestra su salida.
#
# Requisitos: AWS CLI v2 con un perfil que pueda hacer ssm:SendCommand sobre
# la instancia (AWS_PROFILE=<perfil> ./scripts/deploy-remoto.sh), y el commit
# a desplegar ya pusheado a origin/main — el servidor solo ve GitHub.
set -euo pipefail

INSTANCIA="i-0edbdd964ea785529"
REGION="us-east-1"
REPO_SERVIDOR="/home/ssm-user/informes-microservicio"

# git pull como ssm-user (dueño del clon y de sus credenciales de GitHub);
# deploy.sh como root, que es como SSM ejecuta los comandos.
PARAMETROS="{\"commands\":[\"set -e\",\"cd $REPO_SERVIDOR\",\"sudo -u ssm-user -H git pull --ff-only\",\"bash scripts/deploy.sh\"]}"

# Git Bash convierte argumentos que parecen rutas POSIX en rutas de Windows;
# sin esto, /home/ssm-user/... llega al servidor como C:/Program Files/Git/...
export MSYS_NO_PATHCONV=1

COMMAND_ID="$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCIA" \
  --document-name "AWS-RunShellScript" \
  --comment "Deploy informes-microservicio" \
  --parameters "$PARAMETROS" \
  --query "Command.CommandId" \
  --output text)"
echo "Deploy enviado (command id $COMMAND_ID), esperando…"

# No se usa `aws ssm wait command-executed`: se rinde a los ~100 s y un
# docker build tarda más que eso.
while :; do
  ESTADO="$(aws ssm get-command-invocation --region "$REGION" \
    --command-id "$COMMAND_ID" --instance-id "$INSTANCIA" \
    --query "Status" --output text 2>/dev/null || echo "Pending")"
  case "$ESTADO" in
    Pending|InProgress|Delayed) sleep 10 ;;
    *) break ;;
  esac
done

aws ssm get-command-invocation --region "$REGION" \
  --command-id "$COMMAND_ID" --instance-id "$INSTANCIA" \
  --query "StandardOutputContent" --output text

if [ "$ESTADO" != "Success" ]; then
  echo "--- Errores ---"
  aws ssm get-command-invocation --region "$REGION" \
    --command-id "$COMMAND_ID" --instance-id "$INSTANCIA" \
    --query "StandardErrorContent" --output text
  echo "El deploy terminó con estado: $ESTADO"
  exit 1
fi
echo "Deploy OK."
