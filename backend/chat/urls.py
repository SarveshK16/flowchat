from django.urls import path
from .views import chat_view,list_threads, messages_by_thread, delete_thread, get_thread_title

urlpatterns = [
    path("chat/", chat_view, name="chat"),
    path("threads/", list_threads, name="list_threads"),
    path("threads/<int:thread_id>/messages/", messages_by_thread, name="messages_by_thread"),
    path("threads/<int:thread_id>/", delete_thread, name="delete_thread"), 
    path("threads/<int:thread_id>/title/", get_thread_title, name="get_thread_title")
]
