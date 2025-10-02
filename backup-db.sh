#!/bin/bash

# SQLite 데이터베이스 자동 백업 스크립트
# 사용법: bash backup-db.sh

# 스크립트 실행 위치를 프로젝트 루트로 이동
cd "$(dirname "$0")"

# 설정
DB_FILE="database.sqlite"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database-${TIMESTAMP}.sqlite"
RETENTION_DAYS=7

echo "================================================"
echo "데이터베이스 백업 시작: $(date)"
echo "================================================"

# 백업 디렉토리 생성 (없으면)
if [ ! -d "$BACKUP_DIR" ]; then
    echo "백업 디렉토리 생성: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# 데이터베이스 파일 존재 확인
if [ ! -f "$DB_FILE" ]; then
    echo "❌ 오류: 데이터베이스 파일을 찾을 수 없습니다: $DB_FILE"
    exit 1
fi

# 백업 실행
echo "백업 중: $DB_FILE -> $BACKUP_FILE"
cp "$DB_FILE" "$BACKUP_FILE"

# 백업 성공 확인
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 백업 성공: $BACKUP_FILE (크기: $BACKUP_SIZE)"
else
    echo "❌ 백업 실패"
    exit 1
fi

# 오래된 백업 삭제 (7일 이상)
echo "오래된 백업 정리 중 (${RETENTION_DAYS}일 이상)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "database-*.sqlite" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "🗑️  삭제된 백업: ${DELETED_COUNT}개"
else
    echo "삭제할 백업 없음"
fi

# 현재 백업 목록 표시
echo ""
echo "현재 백업 목록:"
ls -lh "$BACKUP_DIR"/database-*.sqlite 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/database-*.sqlite 2>/dev/null | wc -l)
echo ""
echo "총 백업 개수: ${BACKUP_COUNT}개"
echo "================================================"
echo "백업 완료: $(date)"
echo "================================================"

exit 0
