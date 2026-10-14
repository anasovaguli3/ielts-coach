# Hugging Face Spaces (Docker SDK) image. Spaces expects the app on port 7860.
FROM python:3.11-slim

# Spaces runs containers as user 1000.
RUN useradd -m -u 1000 user
USER user
WORKDIR /home/user/app

COPY --chown=user backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir --user -r backend/requirements.txt

COPY --chown=user backend backend
COPY --chown=user frontend frontend

WORKDIR /home/user/app/backend
EXPOSE 7860
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
