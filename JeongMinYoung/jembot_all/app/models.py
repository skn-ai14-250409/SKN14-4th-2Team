from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
import os


class CustomUser(AbstractUser):
    """
    커스텀 사용자 모델 - allauth 소셜 로그인 지원
    """
    nickname = models.CharField(max_length=100, unique=True, verbose_name='닉네임')  # 닉네임
    name = models.CharField(max_length=100, verbose_name='사용자 이름')  # 실제 이름
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True, verbose_name='프로필 사진')  # 프로필 사진

    def __str__(self):
        return self.email  # 이메일로 사용자를 식별

    def save(self, *args, **kwargs):
        # 프로필 사진이 변경되는 경우 기존 파일 삭제
        if self.pk:
            try:
                old_instance = CustomUser.objects.get(pk=self.pk)
                if old_instance.profile_picture and self.profile_picture and old_instance.profile_picture != self.profile_picture:
                    # 기존 파일이 있고 새 파일이 다르면 삭제
                    if os.path.isfile(old_instance.profile_picture.path):
                        os.remove(old_instance.profile_picture.path)
            except CustomUser.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class ChatSession(models.Model):
    """
    채팅 세션 모델 - 챗봇 대화 세션 관리
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_sessions')
    session_id = models.CharField(max_length=100, unique=True)  # 세션 고유 ID
    title = models.CharField(max_length=255)  # 세션 제목
    created_at = models.DateTimeField(auto_now_add=True)  # 생성 일시
    updated_at = models.DateTimeField(auto_now=True)  # 마지막 업데이트 일시
    is_active = models.BooleanField(default=True)  # 활성 상태

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class ChatMessage(models.Model):
    """
    채팅 메시지 모델 - 챗봇 대화 메시지 저장
    """
    MESSAGE_TYPES = [
        ('user', '사용자'),
        ('bot', '봇'),
    ]

    MESSAGE_LEVELS = [
        ('BASIC', '초급'),
        ('INTERMEDIATE', '중급'),
        ('ADVANCED', '고급')
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=30, choices=MESSAGE_TYPES)  # 메시지 타입
    content = models.TextField(verbose_name='내용')  # 메시지 내용
    timestamp = models.DateTimeField(auto_now_add=True)  # 메시지 시간
    level = models.CharField(max_length=30, choices=MESSAGE_LEVELS, default='BASIC')  # 난이도 레벨

    def __str__(self):
        return f'{self.message_type} message in session {self.session.title} at {self.timestamp}'


# Create your models here.

class Stock(models.Model):
    """
    주식 정보 모델
    """
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f'{self.name} ({self.code})'


class StockFavorite(models.Model):
    """
    관심 주식 모델 (주식 즐겨찾기)
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='stock_favorites')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='favorites')

    class Meta:
        # 한 사용자가 동일한 주식을 여러 번 즐겨찾기하는 것을 방지 (user,stock 조합은 유일해야 함)
        unique_together = ('user', 'stock')

    def __str__(self):
        return f'{self.user.username} - {self.stock.name}'


class StockReview(models.Model):
    """
    주식 댓글 모델
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='stock_reviews')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='reviews')
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Review for {self.stock.name} by {self.user.username}'


class StockReviewLike(models.Model):
    """
    주식 댓글 좋아요 모델
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_likes')
    stock_review = models.ForeignKey(StockReview, on_delete=models.CASCADE, related_name='likes')

    # 한 유저가 같은 주식댓글에 좋아요 여러번 눌러도 1번만 저장되게끔 db상 구조화
    class Meta:
        unique_together = ('user', 'stock_review')

    def __str__(self):
        return f'{self.user.username} likes review {self.stock_review.id}'
