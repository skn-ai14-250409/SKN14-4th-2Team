FROM python:3.11-slim

# MySQL 클라이언트 개발 도구 및 의존성 설치
RUN apt-get update && apt-get install -y \
    pkg-config \
    default-libmysqlclient-dev \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Django 프로젝트 파일을 모두 복사
COPY . .

# 데이터베이스 마이그레이션 실행
RUN python manage.py migrate
# 정적 파일 수집
RUN python manage.py collectstatic --noinput

# Gunicorn을 사용하여 Django 서버 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "_homework.wsgi:application"]
 
