# 데이터베이스 자동 백업 가이드

## 백업 시스템 개요

- **백업 대상**: `database.sqlite`
- **백업 위치**: `./backups/`
- **보관 기간**: 7일
- **백업 파일명**: `database-YYYY-MM-DD-HHMMSS.sqlite`

## 수동 백업 실행

프로젝트 루트에서 다음 명령어 실행:

```bash
bash backup-db.sh
```

## 자동 백업 설정 (Cron)

### 1. Cron 편집

```bash
crontab -e
```

### 2. 다음 라인 추가 (매일 새벽 3시 실행)

```bash
0 3 * * * cd /home/ubuntu/SubscriptionManagementWeb && bash backup-db.sh >> /home/ubuntu/SubscriptionManagementWeb/backups/backup.log 2>&1
```

**⚠️ 중요**: `/home/ubuntu/SubscriptionManagementWeb` 부분을 실제 프로젝트 경로로 수정하세요.

### 3. Cron 확인

```bash
crontab -l
```

## 백업 복구 방법

### 1. 백업 목록 확인

```bash
ls -lh backups/
```

### 2. 서버 중단

```bash
pm2 stop all
# 또는
sudo systemctl stop server.js
```

### 3. 현재 DB 백업 (안전을 위해)

```bash
cp database.sqlite database.sqlite.before-restore
```

### 4. 백업 복구

```bash
cp backups/database-2025-10-02-030000.sqlite database.sqlite
```

### 5. 서버 재시작

```bash
pm2 start all
# 또는
sudo systemctl start server.js
```

## 백업 로그 확인

```bash
tail -f backups/backup.log
```

## 디스크 용량 확인

```bash
du -sh backups/
```

## 문제 해결

### 스크립트 실행 권한 오류

```bash
chmod +x backup-db.sh
```

### Cron이 실행되지 않는 경우

- Cron 로그 확인: `grep CRON /var/log/syslog`
- 경로가 절대 경로로 정확히 지정되었는지 확인
- 스크립트 실행 권한 확인

## 주의사항

1. **백업 전 서버 중단 불필요**: SQLite는 파일 복사로 백업 가능
2. **복구 시 서버 중단 필수**: 데이터 정합성을 위해
3. **정기적으로 백업 확인**: 백업이 제대로 생성되는지 모니터링
4. **디스크 용량 모니터링**: 백업으로 인한 용량 부족 방지
