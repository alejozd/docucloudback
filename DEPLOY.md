# Guía de despliegue — servidor 192.168.1.50

## 1. Cómo entrar

```bash
ssh alejo@192.168.1.50          # desde tu LAN
ssh alejo@100.87.12.1           # desde fuera, vía Tailscale
```

- Usuario SSH: **alejo** (es el único usuario con sudo; root solo entra con llave, sin contraseña).
- **Todo lo demás se hace con `sudo`**: los repos y los `.env` son de root o `640 root:apps`,
  así que sin sudo no puedes leer los `.env` ni escribir en los proyectos.

## 2. Regla de oro

| Qué | Con qué usuario |
|---|---|
| `git pull`, `npm install`, `npm run build`, editar `.env`, docker | **root** (`sudo`) |
| Procesos de las apps (PM2) | **apps** → usa `sudo pm2apps ...` |
| Ver procesos | `sudo pm2apps ls` |

Nunca uses `pm2` a secas: como root o como `alejo` verás otra lista (o vacía).
El PM2 de root está deshabilitado; el de `alejo` es independiente.

## 3. Apps

| App | Puerto | Cómo se sirve | Carpeta |
|---|---|---|---|
| frontend (docucloud) | 3000 | PM2 `serve build` | /var/www/docucloudfront |
| docuback | 3100 | PM2 | /var/www/docucloudback |
| torqueflow | 3025 (solo localhost) | PM2 (Next) | /var/www/torqueflow |
| pearl-backend | 3003 | PM2 | /var/www/pearlbyyou/backend |
| conteos-api | 3411 | PM2 | /var/www/conteos/backend |
| exogena-backend | 3421 | PM2 | /var/www/exogena/exogena-backend |
| conteos-frontend | 3006 | Apache (build) | /var/www/conteos/conteos-frontend |
| exogena-frontend | 3008 | Apache (build) | /var/www/exogena/exogena-frontend |
| pearlbyyou-frontend | 80 | Apache (build) | /var/www/pearlbyyou/frontend |
| custodiastock | 3001 / 8081 | Docker Compose | /var/www/custodiastock |

Ramas: docucloud (main), conteos-frontend (**master**), el resto (main).

## 4. Recetas

### docucloud — frontend
```bash
sudo bash /var/www/docucloudfront/scripts/deploy_frontend.sh
```

### docucloud — backend
```bash
cd /var/www/docucloudback
sudo git pull
sudo npm install
sudo pm2apps restart docuback
```

### torqueflow (compila Prisma + Next y reinicia solo)
```bash
sudo bash /var/www/torqueflow/deploy.sh
```

```bash
cd /var/www/<proyecto>/<backend>
sudo git pull
sudo npm install
```

```bash
cd /var/www/<proyecto>/<frontend>
sudo git pull
sudo npm install
sudo npm run build            # genera build/, que Apache ya sirve
# no hay que reiniciar nada: Apache lee los archivos del disco
```
El build **debe ser con sudo**: los `.env.production` son `600 root:root` y sin ellos
el bundle se compila sin las variables (queda apuntando a valores vacíos).

### custodiastock (Docker)
```bash
cd /var/www/custodiastock
sudo docker compose up -d --build backend     # o frontend
sudo docker compose up -d --force-recreate backend   # si cambió el .env
```
Los secretos ya **no** van dentro de la imagen: se inyectan con `env_file`.
Contraseña del admin de la app: `/root/custodiastock-admin-password.txt`.

## 5. Verificar siempre

```bash
sudo pm2apps ls                          # todas online
sudo pm2apps logs <app> --lines 50       # Ctrl+C para salir
sudo pm2apps describe <app>              # script, cwd, intérprete, reinicios
ss -ltnp | grep -E "3000|3100|3400"      # puertos escuchando
```

## 6. Notas

- Los `.env` de docucloud y los backends son `640 root:apps`: root despliega, `apps` ejecuta.
- Si agregas o borras un proceso: `sudo pm2apps save` (si no, no sobrevive un reinicio).
- `sudo pm2apps restart all` reinicia las 7 apps.
- Logs en disco: `/home/apps/.pm2/logs/<app>-out.log` y `-error.log`.
- Arranque automático: `systemctl status pm2-apps` (habilitado).

## 7. PM2: ecosistema y límites de memoria

La definición de los 7 procesos vive en **`/home/apps/ecosystem.config.js`** (dueño `apps`).
Ahí se cambian rutas, intérpretes, variables y límites.

```bash
sudo pm2apps start /home/apps/ecosystem.config.js    # (re)crear todos
sudo pm2apps start /home/apps/ecosystem.config.js --only docuback
sudo pm2apps save                                     # persistir
```

Límites actuales (si una app los supera, PM2 la reinicia sola):

| App | Límite |
|---|---|
| frontend | 300 MB |
| docuback | 500 MB |
| torqueflow | 700 MB |

## 8. Backups automáticos

| Qué | Script | Cuándo | Destino | Retención |
|---|---|---|---|---|
| MySQL (todas las bases) | `/usr/local/bin/docucloud-mysql-backup.sh` | 02:30 | `/var/backups/mysql` | 7 días |
| PostgreSQL (todas, sin `*_test`) | `/usr/local/bin/docucloud-pg-backup.sh` | 02:45 | `/var/backups/postgres` | 7 días |

- Logs: `/var/log/docucloud-mysql-backup.log` y `/var/log/docucloud-pg-backup.log`.
- Crons en `/etc/cron.d/docucloud-mysql-backup` y `/etc/cron.d/docucloud-pg-backup`.
- MySQL lee credenciales del `.env` del backend; PostgreSQL usa el usuario `postgres` por socket.
- **Ojo:** los dos guardan en el mismo disco del servidor. Falta una copia fuera
  (pendiente: `rsync` a otro equipo de la LAN o nube).

### Restaurar

```bash
# MySQL
sudo zcat /var/backups/mysql/docucloud-AAAA-MM-DD-HHMMSS.sql.gz | sudo mysql
# PostgreSQL: base concreta
sudo -u postgres createdb restaurada
sudo -u postgres pg_restore -d restaurada /var/backups/postgres/torqueflowdb-AAAA.dump
```

Una restauración de prueba de `torqueflowdb` ya se validó (6 tablas, mismos registros).

## 9. Monitoreo y alertas

`/usr/local/bin/docucloud-healthcheck.sh` corre **cada 5 minutos** (cron
`/etc/cron.d/docucloud-healthcheck`) y revisa:

- los 7 puertos de las apps (`3000 3003 3100 3400 3411 3421 3025`)
- disco ≥ 85 %
- memoria disponible < 300 MB
- carga del sistema > 3 × núcleos

Si algo falla, envía un mensaje por **Telegram** (usa `TELEGRAM_BOT_TOKEN` y
`TELEGRAM_CHAT_ID` del `.env` de docuback). Solo avisa cuando cambia el estado o
cada 6 h si el problema persiste, y manda un mensaje de "normalizado" al recuperarse.

```bash
sudo /usr/local/bin/docucloud-healthcheck.sh; echo $?   # 0 = todo bien, 1 = problemas
cat /var/lib/docucloud-health.state                     # ultimo estado notificado
tail -20 /var/log/docucloud-healthcheck.log
```
