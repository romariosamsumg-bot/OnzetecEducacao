/**
 * Script executado antes da pintura da página para aplicar as preferências
 * de leitura (tamanho do texto e movimento reduzido) sem "piscar".
 * O hash SHA-256 deste texto é liberado na Content-Security-Policy (next.config.ts).
 */
export const preferencesScript = `(function(){try{var c=document.cookie,d=document.documentElement;var t=/(?:^|; )oz_text_scale=(100|115|130)/.exec(c);if(t)d.setAttribute('data-text-scale',t[1]);var m=/(?:^|; )oz_reduce_motion=(true|false)/.exec(c);if(m)d.setAttribute('data-reduce-motion',m[1]);}catch(e){}})();`;
