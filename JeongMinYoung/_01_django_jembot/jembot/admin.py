from django.contrib import admin

# Register your models here.

from .models import (
    CustomUser, 
    ChatSession, 
    ChatMessage, 
    Stock, 
    StockFavorite, 
    StockReview, 
    StockReviewLike
)

admin.site.register(CustomUser)
admin.site.register(ChatSession)
admin.site.register(ChatMessage)
admin.site.register(Stock)
admin.site.register(StockFavorite)
admin.site.register(StockReview)
admin.site.register(StockReviewLike)