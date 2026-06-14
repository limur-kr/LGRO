from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Answer, Question
from .serializers import AnswerSerializer, QuestionSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        queryset = Question.objects.prefetch_related("answers").select_related("user")
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, "is_service_admin", False)):
            return queryset
        return queryset.filter(is_public=True)

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy", "mine"}:
            return [permissions.IsAuthenticated()]
        if self.action == "answer":
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        queryset = (
            Question.objects.filter(user=request.user)
            .prefetch_related("answers")
            .select_related("user")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        question = self.get_object()
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Answer.objects.create(
            question=question,
            author=request.user,
            content=serializer.validated_data["content"],
        )
        question.status = Question.STATUS_ANSWERED
        question.save(update_fields=["status", "updated_at"])
        output = self.get_serializer(question)
        return Response(output.data, status=status.HTTP_201_CREATED)

# Create your views here.
