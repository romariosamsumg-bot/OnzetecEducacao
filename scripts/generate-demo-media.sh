#!/usr/bin/env bash
# Gera vídeos e legendas de DEMONSTRAÇÃO (sem conteúdo real) para o ambiente local.
# Requer ffmpeg. Saída: public/demo/media/
set -euo pipefail
OUT="public/demo/media"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
mkdir -p "$OUT"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x0B2545:s=1280x720:d=30:r=24" \
  -f lavfi -i "anullsrc=r=44100:cl=mono" -t 30 \
  -vf "drawtext=fontfile=$FONT:text='Vídeo de demonstração':fontcolor=white:fontsize=56:x=(w-tw)/2:y=(h/2)-70,\
drawtext=fontfile=$FONT:text='Onzetec Educação':fontcolor=0xF47B20:fontsize=36:x=(w-tw)/2:y=(h/2)+10,\
drawtext=fontfile=$FONT:text='%{eif\:t\:d}s':fontcolor=0xC9D3E3:fontsize=32:x=(w-tw)/2:y=(h/2)+80" \
  -c:v libx264 -preset veryfast -crf 32 -pix_fmt yuv420p -c:a aac -b:a 32k -movflags +faststart \
  "$OUT/aula-demo.mp4"

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=0x173A6A:s=720x1280:d=15:r=24" \
  -f lavfi -i "anullsrc=r=44100:cl=mono" -t 15 \
  -vf "drawtext=fontfile=$FONT:text='Dica rápida':fontcolor=white:fontsize=60:x=(w-tw)/2:y=(h/2)-60,\
drawtext=fontfile=$FONT:text='(demonstração)':fontcolor=0xF47B20:fontsize=40:x=(w-tw)/2:y=(h/2)+20,\
drawtext=fontfile=$FONT:text='%{eif\:t\:d}s':fontcolor=0xC9D3E3:fontsize=36:x=(w-tw)/2:y=(h/2)+100" \
  -c:v libx264 -preset veryfast -crf 32 -pix_fmt yuv420p -c:a aac -b:a 32k -movflags +faststart \
  "$OUT/dica-demo.mp4"

ffmpeg -y -hide_banner -loglevel error -ss 2 -i "$OUT/aula-demo.mp4" -frames:v 1 -vf scale=640:-1 -q:v 6 "$OUT/aula-demo.jpg"
ffmpeg -y -hide_banner -loglevel error -ss 2 -i "$OUT/dica-demo.mp4" -frames:v 1 -vf scale=360:-1 -q:v 6 "$OUT/dica-demo.jpg"

cat > "$OUT/aula-demo.pt-BR.vtt" <<'VTT'
WEBVTT

00:00:00.000 --> 00:00:05.000
Este é um vídeo de demonstração da Onzetec Educação.

00:00:05.000 --> 00:00:12.000
Aqui aparecerão as legendas da aula, sincronizadas com a fala do professor.

00:00:12.000 --> 00:00:20.000
Você pode ligar ou desligar as legendas no botão "Legendas".

00:00:20.000 --> 00:00:30.000
O seu progresso fica salvo e você continua de onde parou.
VTT

cat > "$OUT/dica-demo.pt-BR.vtt" <<'VTT'
WEBVTT

00:00:00.000 --> 00:00:07.000
Dica rápida de demonstração.

00:00:07.000 --> 00:00:15.000
Assista ao tutorial completo para ver todos os detalhes.
VTT
echo "Mídias de demonstração geradas em $OUT"
