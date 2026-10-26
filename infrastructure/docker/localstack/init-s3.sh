#!/bin/bash
# Cria bucket S3 no LocalStack para desenvolvimento
echo "Criando bucket S3 para documentos..."
awslocal s3api create-bucket --bucket consorcio-documents --region us-east-1
awslocal s3api put-bucket-versioning \
  --bucket consorcio-documents \
  --versioning-configuration Status=Enabled
echo "Bucket consorcio-documents criado com sucesso."
