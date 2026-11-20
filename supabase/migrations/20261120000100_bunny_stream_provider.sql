-- Bunny Stream como provedor de vídeo (opção de menor custo).
alter type public.video_provider add value if not exists 'bunny_stream';
