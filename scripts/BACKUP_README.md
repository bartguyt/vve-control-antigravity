# VvE Control - Database Backup System

Automatische database backups na elke merge naar `main` branch.

## 📁 Backup Locatie

Backups worden opgeslagen **buiten de repository** voor veiligheid:

```
~/backups/vve-control/
├── latest → symlink naar meest recente backup
├── 20260124_143022_main_a3f2c1/
│   ├── schema.sql          # Database schema
│   ├── data.sql            # Database data
│   ├── metadata.json       # Backup info (branch, commit, timestamp)
│   └── backup.log          # Backup process log
├── 20260124_120530_main_b8d4e2/
└── ...
```

## 🔄 Automatische Backups

### Git Hook Setup

De backup wordt automatisch getriggerd door een **git post-merge hook**:

```bash
# De hook is al geïnstalleerd in:
.git/hooks/post-merge

# Werking:
# 1. Je merge naar main: git merge feature-branch
# 2. Hook detecteert merge naar main
# 3. Scripts/backup-database.sh wordt uitgevoerd
# 4. Backup wordt opgeslagen in ~/backups/vve-control/
```

### Handmatige Backup

Je kunt ook handmatig een backup maken:

```bash
./scripts/backup-database.sh
```

## 📦 Backup Beheer

### Backups Bekijken

```bash
# Toon alle backups
ls -lth ~/backups/vve-control/

# Toon laatste 10 backups met info
ls -t ~/backups/vve-control/ | head -10 | while read dir; do
  echo "$dir"
  cat ~/backups/vve-control/$dir/metadata.json 2>/dev/null | grep '"branch"\|"commit"'
done
```

### Backup Opschonen

Backups ouder dan 30 dagen worden automatisch verwijderd. Om handmatig op te schonen:

```bash
# Verwijder backups ouder dan 30 dagen
find ~/backups/vve-control/ -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \;

# Verwijder backups ouder dan 7 dagen
find ~/backups/vve-control/ -maxdepth 1 -type d -name "20*" -mtime +7 -exec rm -rf {} \;
```

### Backup Grootte

```bash
# Totale grootte van alle backups
du -sh ~/backups/vve-control/

# Grootte per backup
du -sh ~/backups/vve-control/20*
```

## 🔙 Database Restoren

### Snel Restore

```bash
# Restore meest recente backup
./scripts/restore-database.sh latest

# Restore specifieke backup (gebruik timestamp uit filename)
./scripts/restore-database.sh 20260124_143022
```

### Handmatige Restore

```bash
cd ~/projects/vve-control

# Start Supabase (als nog niet draait)
supabase start

# Get database URL
DB_URL=$(supabase status | grep "DB URL" | awk '{print $3}')

# Restore schema
psql $DB_URL < ~/backups/vve-control/latest/schema.sql

# Restore data
psql $DB_URL < ~/backups/vve-control/latest/data.sql
```

## 🔐 Veiligheid & Encryptie

### Optioneel: Encrypted Backups

Voor extra beveiliging kun je backups encrypteren met GPG:

```bash
# 1. Installeer GPG (als nog niet geïnstalleerd)
brew install gnupg

# 2. Enable encryptie
export VVE_ENCRYPT_BACKUPS=true

# 3. Run backup (vraagt om wachtwoord)
./scripts/backup-database.sh
```

Encrypted backups krijgen de extensie `.tar.gz.gpg` en worden opgeslagen naast de normale backup.

### Decrypten

```bash
# Decrypt backup archive
gpg -d backup.tar.gz.gpg | tar xzf -
```

### Permanente Encryptie

Voeg toe aan je `~/.bashrc` of `~/.zshrc`:

```bash
export VVE_ENCRYPT_BACKUPS=true
```

## 🛠️ Troubleshooting

### "Supabase CLI not found"

```bash
# Installeer Supabase CLI
brew install supabase/tap/supabase

# Verify installatie
supabase --version
```

### "Not a Supabase project"

Zorg dat je in de project root zit:

```bash
cd ~/projects/vve-control
./scripts/backup-database.sh
```

### Backup Faalt tijdens Merge

Als de backup faalt, zie je een warning maar de merge gaat door. Je kunt handmatig een backup maken:

```bash
./scripts/backup-database.sh
```

### Disk Space Issues

```bash
# Check hoeveel ruimte backups gebruiken
du -sh ~/backups/vve-control/

# Verwijder oude backups
find ~/backups/vve-control/ -maxdepth 1 -type d -name "20*" -mtime +7 -exec rm -rf {} \;
```

## 📊 Backup Strategie

### Wat wordt gebackupt?

- ✅ **Schema**: Alle tables, views, functions, triggers
- ✅ **Data**: Alle rijen in alle tables
- ✅ **Metadata**: Branch, commit hash, timestamp
- ❌ **Niet gebackupt**: Supabase Storage files, Edge Functions code

### Retention Policy

- **Automatisch**: 30 dagen (configuurbaar in script)
- **Handmatig**: Bewaar zelf belangrijke milestones

### Best Practices

1. **Voor grote refactors**: Maak een extra backup
   ```bash
   ./scripts/backup-database.sh
   cp -r ~/backups/vve-control/latest ~/backups/vve-control/MILESTONE_grote_refactor
   ```

2. **Voor productie deploys**: Test restore eerst
   ```bash
   ./scripts/restore-database.sh latest
   # Verify data
   psql $DB_URL -c "SELECT COUNT(*) FROM associations;"
   ```

3. **Cloud backup**: Sync naar cloud storage
   ```bash
   # Example met rsync naar NAS/cloud
   rsync -av ~/backups/vve-control/ user@backup-server:/backups/vve-control/
   ```

## 🔧 Configuratie

### Backup Root Aanpassen

Edit `scripts/backup-database.sh`:

```bash
# Verander deze regel:
BACKUP_ROOT="${HOME}/backups/vve-control"

# Naar bijvoorbeeld:
BACKUP_ROOT="/Volumes/ExternalDrive/vve-backups"
```

### Retention Period Aanpassen

Edit `scripts/backup-database.sh`:

```bash
# Verander deze regel (30 dagen):
find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \;

# Naar bijvoorbeeld 90 dagen:
find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" -mtime +90 -exec rm -rf {} \;
```

## 📝 Logging

Elke backup schrijft logs naar:
- `backup.log` in de backup directory
- Console output tijdens backup

Bekijk logs:

```bash
# Laatste backup log
cat ~/backups/vve-control/latest/backup.log

# Alle errors in logs
grep -i error ~/backups/vve-control/*/backup.log
```

## 🚀 Advanced Usage

### Remote Database Backup

Voor productie Supabase (hosted):

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres"

# Run backup (uses remote DB)
./scripts/backup-database.sh
```

### Scheduled Backups (Cron)

Voor extra veiligheid, plan dagelijkse backups:

```bash
# Open crontab
crontab -e

# Voeg toe (dagelijks om 2:00 AM):
0 2 * * * cd ~/projects/vve-control && ./scripts/backup-database.sh >> ~/backups/vve-control/cron.log 2>&1
```

### Slack/Discord Notifications

Extend het script met notifications:

```bash
# In backup-database.sh, voeg toe na successful backup:

# Slack webhook
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -d "{\"text\":\"✅ VvE Database backup complete: $BACKUP_SIZE\"}"

# Discord webhook
curl -X POST https://discord.com/api/webhooks/YOUR/WEBHOOK \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"✅ Database backup complete: $BACKUP_SIZE\"}"
```

## 📋 Checklist

### Setup (Eenmalig)

- [x] Git hook geïnstalleerd (`.git/hooks/post-merge`)
- [x] Backup script executable (`chmod +x scripts/backup-database.sh`)
- [x] Restore script executable (`chmod +x scripts/restore-database.sh`)
- [x] Backup directory aangemaakt (`~/backups/vve-control/`)
- [x] `.gitignore` updated (backup files excluded)
- [ ] Supabase CLI geïnstalleerd (`brew install supabase/tap/supabase`)
- [ ] GPG geïnstalleerd voor encryptie (optioneel)

### Test Backup/Restore Flow

```bash
# 1. Maak een test backup
./scripts/backup-database.sh

# 2. Verify backup bestaat
ls -lh ~/backups/vve-control/latest/

# 3. Test restore
./scripts/restore-database.sh latest

# 4. Verify data
supabase db diff
```

## 🆘 Support

Voor vragen of problemen:
1. Check de logs: `cat ~/backups/vve-control/latest/backup.log`
2. Verify Supabase CLI: `supabase --version`
3. Check disk space: `df -h ~`
4. Review git hooks: `cat .git/hooks/post-merge`

## 📚 Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Git Hooks Guide](https://git-scm.com/docs/githooks)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [GPG Encryption Guide](https://www.gnupg.org/gph/en/manual.html)
