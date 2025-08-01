from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# Create your models here.

class Custom_user(AbstractUser):
    id_key = models.CharField(max_length=100, unique=True, null=True, blank=True)
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    profile_picture = models.URLField(max_length=500, null=True, blank=True)
    signup_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.username or self.email

class Nickname(models.Model):
    user = models.OneToOneField(Custom_user, on_delete=models.CASCADE, related_name='nickname')
    nickname = models.CharField(max_length=100)

    def __str__(self):
        return self.nickname

class ChatSession(models.Model):
    """채팅 세션 모델"""
    user = models.ForeignKey(Custom_user, on_delete=models.CASCADE, related_name='chat_sessions')
    session_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200, default="새로운 대화")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"

class ChatMessage(models.Model):
    """채팅 메시지 모델"""
    MESSAGE_TYPES = [
        ('user', '사용자'),
        ('bot', '봇'),
    ]
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.session.title} - {self.message_type}: {self.content[:50]}"


class Stock(models.Model):
    """기업 모델"""
    name = models.CharField(max_length=255)  # 기업명
    code = models.CharField(max_length=50, unique=True)  # 기업코드 (고유 값)

    def __str__(self):
        return self.name


class StockReview(models.Model):
    """기업 리뷰 모델"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='stock_reviews')  # Stock 모델과의 관계
    user = models.ForeignKey(Custom_user, on_delete=models.CASCADE, related_name='user_reviews')
    content = models.TextField()  # 리뷰 내용
    created_at = models.DateTimeField(auto_now_add=True)  # 리뷰 작성 시간

    def __str__(self):
        return f"Review for {self.stock.name}: {self.content[:50]}"  # 첫 50글자만 출력