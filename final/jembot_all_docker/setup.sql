-- grant all privileges on jembotdb.* to 'jembot'@'%';
-- # 변경된 권한 설정을 서버 메모리에 즉시 로드하여 적용합니다.
-- flush privileges;

# root계정으로 실행

# 모든 host에서 접근가능한 django계정 생성(비밀번호 django)
create user 'jembot_ur'@'%' identified by 'jembot'; 
-- user : username, identified by : password

# qnadb 생성
create database jembotdatabase character set utf8mb4 collate utf8mb4_unicode_ci;

# django사용자에게 qnadb 권한 부여
grant all privileges on jembotdatabase.* to 'jembot'@'%';
flush privileges;



-- 이렇게 유저를 그대로 하고 권한을 부여하면 됨  위에는 내가 너무 복잡하게 함 
-- create database qnadb character set utf8mb4 collate utf8mb4_unicode_ci;
-- grant all privileges on qnadb.* to 'django'@'%';
-- flush privileges;