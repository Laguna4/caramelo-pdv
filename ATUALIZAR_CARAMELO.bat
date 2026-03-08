@echo off
title Atualizando Caramelo PDV...
echo ==========================================
echo      A T U A L I Z A N D O   C A R A M E L O
echo ==========================================
echo.
echo 1. Entrando na pasta do projeto...
cd /d "%~dp0"

echo 2. Instalando dependencias (rapido)...
call npm install

echo 3. Criando versao de producao (Build)...
call npm run build

echo 4. Enviando para o Firebase (Deploy - via NPX)...
echo    (Isso pode demorar um pouco na primeira vez e pedir login)
call npx -y firebase-tools deploy

echo.
echo ==========================================
echo      S U C E S S O !
echo ==========================================
echo O Caramelo PDV deve estar online em alguns instantes.
echo Pressione qualquer tecla para sair.
pause
