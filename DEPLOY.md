# Guía de despliegue — servidor 192.168.1.50

## 1. Cómo entrar

```bash
ssh alejo@192.168.1.50          # desde tu LAN
ssh alejo@100.87.12.1           # desde fuera, vía Tailscale
```

- Usuario SSH: **alejo** (es el único usuario con sudo; root solo entra con llave, sin contraseña).
- **Todo lo demás se hace con `sudo`**: los repos y los `.env` son de root o `640 root:apps`,
  así que sin sudo no puedes leer los `.env` ni escribir en los proyectos.
- **Huella SSH (ed25519), idéntica por LAN y por Tailscale**:
  `SHA256:hfC5jj2hnLODRlR5un9HOtyfjAJRyDTZpbE9dMY0gHA`.
  Con `plink`/`pscp` conviene fijarla para no aceptar un host nuevo a ciegas:
  `plink -hostkey SHA256:hfC5... alejo@100.87.12.1`.
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
| exogena.zdevs.uk | Apache :80 | exógena (frontend) |
| conteosapp.zdevs.uk | Apache :3006 | conteos (frontend) |
| conteosapi.zdevs.uk | PM2 :3411 | conteos (API) |
| torqueflow.zdevs.uk | PM2 :3025 | torqueflow |
| custodiastock.zdevs.uk | Docker (:8081) | custodiastock |
| usuarios.zdevs.uk | PM2 :3200 | usuarios |
| unitask-sync.zdevs.uk | PM2 :8787 | unitask |
| ssh.zdevs.uk | ssh :22 | acceso SSH |

Ojo con la ortografía: el host real de la tienda es **`pearlbyyou.zdevs.uk`** (con
"you"), igual que la carpeta `/var/www/pearlbyyou`. `pearlbyou.zdevs.uk` y
`pearl.zdevs.uk` **no existen** (sin registro DNS): no los uses en configuraciones.

Hostnames que ya no tienen servicio detrás y conviene borrar del panel para no
confundir: `pearl.zdevs.uk`, `vecinos.zdevs.uk`, `vecinosapi.zdevs.uk`.

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

- **puertos**: `3000 3003 3100 3411 3421 3025` (apps) + `3001 8081` (custodiastock)
- **servicios**: `apache2`, `mysql`, `cloudflared`, `docker`
- **frescura de backups**: si el último dump de MySQL o PostgreSQL tiene más de 36 h
- disco ≥ 85 %
- memoria disponible < 300 MB
- carga del sistema > 4 × núcleos (solo pasados 5 min del arranque)

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
```
