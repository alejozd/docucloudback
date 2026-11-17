# Guía de despliegue — servidor 192.168.1.50

## 1. Cómo entrar

**SSH es solo con llave** (desde el 2026-11-17 la contraseña está desactivada:
`/etc/ssh/sshd_config.d/99-solo-llave.conf`). La contraseña de `alejo` sigue valiendo
**solo para `sudo`**, no para entrar.

```powershell
# Windows (OpenSSH), desde el repo de trabajo
ssh -i .deploy-key\docucloud_ed25519 -o UserKnownHostsFile=.deploy-key\known_hosts alejo@100.87.12.1
scp -i .deploy-key\docucloud_ed25519 archivo.sh alejo@100.87.12.1:/tmp/     # pscp ya NO sirve
```

- Direcciones: `192.168.1.50` (LAN), **`100.87.12.1`** (Tailscale, para cuando estás fuera).
- En **PuTTY** hace falta la llave en formato `.ppk` (se guarda aparte, nunca encima de la
  OpenSSH): `Connection → SSH → Auth → Credentials → Private key file`. Huella esperada:
  `SHA256:hfC5jj2hnLODRlR5un9HOtyfjAJRyDTZpbE9dMY0gHA`.
- **Todo lo demás se hace con `sudo`**: los repos y los `.env` son de root o `640 root:apps`,
  así que sin sudo no puedes leer los `.env` ni escribir en los proyectos.
- Si estás **fuera de casa**, Tailscale da acceso completo al servidor (SSH, MySQL en
  `100.87.12.1:3306`, y los puertos de las apps). Lo que **no** funciona fuera de la LAN es el
  escritorio `alejo-r5` (`192.168.1.6`), salvo que ese equipo también entre a Tailscale.

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
| unitask-sync-api | 8787 | PM2 | /var/www/unitask-sync |

Ramas: docucloud (main), conteos-frontend (**master**), el resto (main).

## 3.1 Dominios públicos (Cloudflare)

El túnel corre **con `--token`**: su configuración de hostnames (Public Hostnames) se
administra desde el **panel de Cloudflare Zero Trust**. `/etc/cloudflared/config.yml`
**no se usa** (quedó marcado como OBSOLETO); editarlo no cambia nada.

| Dominio | Llega a | Sirve |
|---|---|---|
| app.zdevs.uk | Apache :80 (vhost app.zdevs.uk) → PM2 :3000 | docucloud (frontend) |
| api.zdevs.uk | PM2 :3100 | docucloud (backend) |
| pearlbyyou.zdevs.uk | Apache :80 (vhost pearlbyyou.conf) + `/uploads` → :3003 | tienda Pearl |
| exogena.zdevs.uk | Apache :80 (:3008) | exógena (frontend) |
| exogena-api.zdevs.uk | PM2 :3421 | exógena (API) |
| conteosapp.zdevs.uk | Apache :3006 | conteos (frontend) |
| conteosapi.zdevs.uk | PM2 :3411 | conteos (API) |
| torqueflow.zdevs.uk | PM2 :3025 | torqueflow |
| custodiastock.zdevs.uk | Docker (:8081) | custodiastock |
| custodiastock-api.zdevs.uk | Docker (:3001) | custodiastock (API) |
| unitask-sync.zdevs.uk | PM2 :8787 | UniTask Sync (API de la app) |
| ssh.zdevs.uk | `ssh://localhost:22` (TCP) | acceso SSH |
| db.zdevs.uk | `tcp://localhost:3306` (TCP) | MySQL |

Los dos TCP (`ssh` y `db`) **no están abiertos a Internet**: Cloudflare no publica TCP crudo,
hacen falta el cliente `cloudflared access` y una política de Zero Trust. Comprobado: los
puertos 22 y 3306 están cerrados desde fuera.

La lista de arriba sale del propio túnel, no de este documento (que se queda viejo). Para
verla al día:

```bash
curl -s http://127.0.0.1:20241/config | python3 -c \
  'import json,sys; [print(r.get("hostname"), "->", r["service"]) for r in json.load(sys.stdin)["config"]["ingress"]]'
```

Ojo con la ortografía: el host real de la tienda es **`pearlbyyou.zdevs.uk`** (con
"you", 19 caracteres), igual que la carpeta `/var/www/pearlbyyou`. La variante con una
sola "y" **no existe** (sin registro DNS): no la uses en configuraciones. Es un nombre
que se confunde al escribirlo de memoria; si hay dudas, comparar con la lista del túnel
de arriba o contar los caracteres, no mirarlo a ojo.

Hostnames publicados sin servicio detrás: **ninguno** (el 2026-11-17 se desplegó
`unitask-sync`, que hasta entonces daba 502).

Ya **no existen** `vecinos.zdevs.uk` ni `vecinosapi.zdevs.uk` (dominios, vhosts, bases y
backups borrados el 2026-11-17) ni `pearl.zdevs.uk`. Si aparecen en listas antiguas, están
obsoletos. `usuarios.zdevs.uk` tampoco existe (ni DNS ni ingress): si figura en alguna
configuración, es un error.

### unitask-sync (API de UniTask)

Backend Fastify + PostgreSQL (`unitask_sync`, usuario `usync`) que sincroniza la app
UniTask. Corre en el PM2 de `apps` como **`unitask-sync-api`** (límite 300 MB) desde
`/var/www/unitask-sync`.

- Código: el original de desarrollo está en `/home/alejo/unitask-sync-server`; la copia que
  corre es `/var/www/unitask-sync` (dueño `apps`, `.env` en `640 root:apps`).
- `dist/` ya viene compilado. Si se toca el código, hay que recompilar y reiniciar:
  ```bash
  cd /var/www/unitask-sync
  sudo npm run build          # tsc -p tsconfig.json
  sudo pm2apps restart unitask-sync-api
  ```
- El `.env` fija `ATTACHMENTS_DIR=/var/www/unitask-sync/data/attachments` (los adjuntos van
  a disco, no a la base).
- Comprobación: `curl -s localhost:8787/health` → `{"status":"ok"}`.
- La base se respalda a diario con el resto de PostgreSQL (`/var/backups/postgres/unitask_sync-*.dump`).

Comprobación rápida desde el propio servidor (pasa por Cloudflare):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://pearlbyyou.zdevs.uk/
curl -s -o /dev/null -w "%{http_code}\n" https://app.zdevs.uk/
```

## 4. Recetas

### docucloud — frontend
```bash
sudo bash /var/www/docucloudfront/scripts/deploy_frontend.sh
```

El script hace `git pull`, `npm install`, `npm run build` y reinicia el PM2 `frontend`.
Si se queja de cambios locales: `sudo git -C /var/www/docucloudfront checkout -- package-lock.json`.

### Si no puedes hacer `push` a GitHub (p. ej. sin credenciales en ese equipo)

`deploy_frontend.sh` empieza con `git pull`, así que los commits tienen que estar en el
repo del servidor. Sin push, se llevan con un paquete de git:

```bash
# en el PC, con el commit que ya tiene el servidor como base
git bundle create front.bundle <commit-del-servidor>..main
scp -i .deploy-key/docucloud_ed25519 front.bundle alejo@100.87.12.1:/tmp/

# en el servidor
sudo git -C /var/www/docucloudfront fetch /tmp/front.bundle 'main:refs/heads/entrante'
sudo git -C /var/www/docucloudfront merge --ff-only entrante
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
| unitask-sync-api | 300 MB |

## 8. Backups automáticos

| Qué | Script | Cuándo | Destino | Retención |
|---|---|---|---|---|
| MySQL (todas las bases) | `/usr/local/bin/docucloud-mysql-backup.sh` | 02:30 | `/var/backups/mysql` | 7 días |
| PostgreSQL (todas, sin `*_test`) | `/usr/local/bin/docucloud-pg-backup.sh` | 02:45 | `/var/backups/postgres` | 7 días |

- Logs: `/var/log/docucloud-mysql-backup.log` y `/var/log/docucloud-pg-backup.log`.
- Crons en `/etc/cron.d/docucloud-mysql-backup` y `/etc/cron.d/docucloud-pg-backup`.
- **Avisan por Telegram solo si fallan** (wrapper `/usr/local/bin/docucloud-backup-notify.sh`):
  si el backup sale bien no molesta; si falla llega un `❌ ... El backup X fallo`.
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

- **puertos**: `3000 3003 3100 3411 3421 3025 8787` (apps) + `3001 8081` (custodiastock)
- **servicios**: `apache2`, `mysql`, `cloudflared`, `docker`
- **frescura de backups**: si el último dump de MySQL o PostgreSQL tiene más de 36 h
- disco ≥ 85 %
- memoria disponible < 300 MB
- carga del sistema > 4 × núcleos (solo pasados 5 min del arranque)
- **HTTPS de todo lo que publica el túnel** (añadido el 2026-11-17): lee la lista de
  hostnames `http`/`https` de `http://127.0.0.1:20241/config` y pide cada uno; un `5xx`
  o una respuesta vacía (tras un reintento) es problema. Así se detecta lo que el
  chequeo de puertos no ve: túnel caído, DNS roto o vhost mal puesto.
  Los servicios `tcp://` (ssh, db) se ignoran porque no se pueden pedir por curl.
  Los hostnames publicados por error están en `DOMINIOS_EXCLUIR` (ahora
  `unitask-sync`, que no tiene backend detrás).
- **caducidad del certificado**: una vez por hora, avisa si quedan menos de 21 días.

Una ejecución tarda ~5 s (lo que tardan los HTTPS).

Si algo falla, envía un mensaje por **Telegram**. Solo avisa cuando cambia el estado
o cada 6 h si el problema persiste, y manda un "normalizado" al recuperarse.

**Credenciales del bot**: viven en `/root/.telegram-notify.cnf` (600), independiente
del `.env` de la app; si ese archivo falta, cae al `.env` de docuback. Así el
monitoreo sigue funcionando aunque se toquen los `.env` de las aplicaciones.

```bash
sudo /usr/local/bin/docucloud-healthcheck.sh; echo $?   # 0 = todo bien, 1 = problemas
cat /var/lib/docucloud-health.state                     # ultimo estado notificado
tail -20 /var/log/docucloud-healthcheck.log
sudo cat /root/.telegram-notify.cnf                     # token y chat del bot
ls -l /usr/local/bin/docucloud-healthcheck.sh.bak-*     # version anterior del script
```
