# Backup and restore

AMSTools keeps data in two places:

1. The MySQL database: companies, users, customers, products, invoices, payments, and surat jalan rows.
2. The `uploads/` folder on disk: company logos and delivery proof photos.

Proof photos are not stored in MySQL. The database only keeps a relative path such as `proofs/<tenant id>/<surat jalan id>.jpg`. A database dump by itself cannot restore those files. Back up the database and `uploads/` together, and restore a pair taken at the same time.

`uploads/` is gitignored. It exists only on the machine that runs the app, next to `package.json`:

- `uploads/logos/` — company logos printed on documents
- `uploads/proofs/<tenant id>/` — surat jalan proof photos

## MySQL

`mysqldump` with `--single-transaction` is the right dump for InnoDB. It reads a consistent snapshot without locking the tables for the whole run.

Put the database user and password in an option file so they do not show up in the process list or in the scheduler command. On Linux, `~/.my.cnf` for the user that runs the backup:

```ini
[client]
user=amstools
password=YOUR_PASSWORD
host=127.0.0.1
```

```bash
chmod 600 ~/.my.cnf
```

The user, host, and database name must match `DATABASE_URL`. Then:

```bash
mkdir -p /var/backups/amstools
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  --databases amstools \
  > /var/backups/amstools/amstools-$(date +%F).sql
```

On Windows with Laragon the client is `mysqldump.exe` inside the MySQL version Laragon is using, for example `C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe`. The folder name changes with the version. Laragon's default `root` account has an empty password; if you set one, pass `--password` or use a defaults file. Do not commit that file.

## uploads/

From the app directory (the folder that contains `package.json`):

```bash
tar -C /var/www/amstools -czf /var/backups/amstools/uploads-$(date +%F).tar.gz uploads
```

Skip this step when `uploads/` does not exist yet. Windows 10 and later include `tar`.

## Restore

Stop the app first (PM2, or stop the Node process) so nothing writes during the restore. Use a `.sql` file and an `uploads` archive from the same day.

```bash
mysql --default-character-set=utf8mb4 amstools < /var/backups/amstools/amstools-YYYY-MM-DD.sql
rm -rf /var/www/amstools/uploads
tar -C /var/www/amstools -xzf /var/backups/amstools/uploads-YYYY-MM-DD.tar.gz
```

Start the app again. The user that runs `next start` must be able to read `uploads/`. If the files come back owned by root, change the owner to that user.

A newer database with an older `uploads/` folder (or the reverse) leaves surat jalan rows pointing at missing photos, or photos with no row.

## Daily job on Linux

Save this as `/usr/local/sbin/amstools-backup.sh` and `chmod 700` it. Change `APP_DIR` if the app is not in `/var/www/amstools`. The script keeps 14 days of files in `BACKUP_DIR`.

```bash
#!/bin/sh
set -eu
APP_DIR=/var/www/amstools
BACKUP_DIR=/var/backups/amstools
STAMP=$(date +%F)
mkdir -p "$BACKUP_DIR"
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  --databases amstools \
  > "$BACKUP_DIR/amstools-$STAMP.sql"
if [ -d "$APP_DIR/uploads" ]; then
  tar -C "$APP_DIR" -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" uploads
fi
find "$BACKUP_DIR" -type f -mtime +14 -delete
```

Cron, every day at 02:00, as a user that can read MySQL and `uploads/`:

```cron
0 2 * * * /usr/local/sbin/amstools-backup.sh >> /var/log/amstools-backup.log 2>&1
```

Install it with `crontab -e`. Copy `/var/backups/amstools` to another machine or disk. A backup that lives only on the same disk is lost with that disk.

## Daily job on Windows / Laragon

Save `C:\backups\amstools-backup.bat` outside the git repo. Point `DUMP` at the `mysqldump.exe` for the MySQL version selected in Laragon, and `APP` at the folder that contains `package.json`. The script writes the dump with `>` so the file stays a plain SQL script. It keeps 14 days of files.

```bat
@echo off
setlocal
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set STAMP=%%i
set APP=C:\laragon\www\AMSTools
set DEST=C:\backups\amstools
set DUMP=C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe
if not exist "%DEST%" mkdir "%DEST%"
"%DUMP%" --single-transaction --routines --triggers --default-character-set=utf8mb4 --user=root --host=127.0.0.1 --databases amstools > "%DEST%\amstools-%STAMP%.sql"
if exist "%APP%\uploads" tar -C "%APP%" -czf "%DEST%\uploads-%STAMP%.tar.gz" uploads
forfiles /P "%DEST%" /D -14 /C "cmd /c del @path" 2>nul
```

Register it daily at 02:00 from an elevated Command Prompt:

```bat
schtasks /Create /SC DAILY /TN "AMSTools backup" /TR "C:\backups\amstools-backup.bat" /ST 02:00 /F
```

Task Scheduler can point at the same `.bat` (Action: Start a program). Run it once by hand and confirm both `amstools-YYYY-MM-DD.sql` and `uploads-YYYY-MM-DD.tar.gz` are in `C:\backups\amstools`.

## Check that a backup works

Restore one dump into a spare database and unpack the matching `uploads` archive, then open a surat jalan that has a proof photo. Do not commit `.sql` files, archives, or `uploads/` to git.
