from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class CustomUser(AbstractUser):
    """
    커스텀 사용자 모델
    """
    # null : db상 null값 허용
    nickname = models.CharField(max_length=100, unique=True)  # verbose_name : 관리자 페이지 화면에 나오는 이름
    password = models.CharField(max_length=100, null=True)  # 구글 로그인 시, password 불필요
    user_name = models.CharField(max_length=100)
    email = models.CharField(max_length=100)
    user_id = models.CharField(max_length=100, null=True)  # 구글 로그인 시, id 불필요
    google_id = models.CharField(max_length=255, null=True, unique=True)  # 일반 로그인 시, 불필요
    profile_picture = models.URLField(max_length=500, null=True, blank=True)
    signup_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user_name


class ChatSession(models.Model):
    """
    채팅 세션 모델
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='chat_sessions')
    session_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    """
    채팅 메시지 모델
    """
    MESSAGE_TYPES = [
        ('user', '사용자'),
        ('bot', '봇'),
    ]

    MessageLevels = [
        ('BASIC', '초급'),
        ('INTERMEDIATE', '중급'),
        ('ADVANCED', '고급')
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message_type = models.CharField(max_length=30, choices=MESSAGE_TYPES)
    content = models.TextField(verbose_name='내용')
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=30, choices=MessageLevels)

    def __str__(self):
        return f'{self.message_type} message in session {self.session.id} at {self.timestamp}'


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

